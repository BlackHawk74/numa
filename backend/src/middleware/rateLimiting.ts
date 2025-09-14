import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

/**
 * Request cache for HuggingFace API calls
 */
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface UsageStats {
  totalRequests: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  costEstimate: number;
  lastReset: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 1000;

  /**
   * Generate cache key from request data
   */
  private generateKey(data: any): string {
    const serialized = JSON.stringify(data);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Get cached response
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached response
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Generate cache key for HuggingFace requests
   */
  generateHFKey(model: string, inputs: any, parameters?: any): string {
    return this.generateKey({ model, inputs, parameters });
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private usageStats: UsageStats = {
    totalRequests: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    costEstimate: 0,
    lastReset: Date.now()
  };

  /**
   * Check if request is within rate limit
   */
  checkLimit(
    clientId: string, 
    maxRequests: number, 
    windowMs: number
  ): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    
    // Clean up old entries
    this.cleanup();

    let entry = this.limits.get(clientId);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        lastRequest: now
      };
      this.limits.set(clientId, entry);
    }

    const allowed = entry.count < maxRequests;
    if (allowed) {
      entry.count++;
      entry.lastRequest = now;
      this.usageStats.totalRequests++;
    }

    return {
      allowed,
      resetTime: entry.resetTime,
      remaining: Math.max(0, maxRequests - entry.count)
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Record API call for cost tracking
   */
  recordApiCall(model: string, inputSize: number, outputSize: number = 0): void {
    this.usageStats.apiCalls++;
    
    // Estimate cost based on model and usage
    const costPerToken = this.getModelCost(model);
    const estimatedCost = (inputSize + outputSize) * costPerToken;
    this.usageStats.costEstimate += estimatedCost;
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit(): void {
    this.usageStats.cacheHits++;
  }

  recordCacheMiss(): void {
    this.usageStats.cacheMisses++;
  }

  /**
   * Get estimated cost per token for different models
   */
  private getModelCost(model: string): number {
    const costs: Record<string, number> = {
      'openai/whisper-large-v3-turbo': 0.0001, // per second of audio
      'meta-llama/Llama-3.1-8B-Instruct': 0.00001, // per token
      'hexgrad/Kokoro-82M': 0.00005, // per character
      'j-hartmann/emotion-english-distilroberta-base': 0.000005 // per token
    };
    
    return costs[model] || 0.00001; // default cost
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    return { ...this.usageStats };
  }

  /**
   * Reset usage statistics
   */
  resetStats(): void {
    this.usageStats = {
      totalRequests: 0,
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      costEstimate: 0,
      lastReset: Date.now()
    };
  }
}

// Singleton instances
export const requestCache = new RequestCache();
export const rateLimiter = new RateLimiter();

/**
 * Middleware for caching HuggingFace API responses
 */
export const cacheMiddleware = (ttl: number = 5 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests and specific POST endpoints
    if (req.method === 'GET' || req.path.includes('/api/therapy')) {
      const cacheKey = requestCache.generateHFKey(
        req.body?.model || 'unknown',
        req.body?.inputs || req.query,
        req.body?.parameters
      );

      const cached = requestCache.get(cacheKey);
      if (cached) {
        rateLimiter.recordCacheHit();
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      rateLimiter.recordCacheMiss();
      res.set('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          requestCache.set(cacheKey, data, ttl);
        }
        return originalJson.call(this, data);
      };
    }

    next();
  };
};

/**
 * Enhanced rate limiting middleware with different limits for different endpoints
 */
export const enhancedRateLimit = (config: {
  general?: { max: number; windowMs: number };
  api?: { max: number; windowMs: number };
  expensive?: { max: number; windowMs: number };
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    let limitConfig = config.general || { max: 100, windowMs: 15 * 60 * 1000 };

    // Apply stricter limits for API endpoints
    if (req.path.startsWith('/api/')) {
      limitConfig = config.api || { max: 50, windowMs: 15 * 60 * 1000 };
    }

    // Apply very strict limits for expensive operations
    if (req.path.includes('/stt') || req.path.includes('/therapy') || req.path.includes('/tts')) {
      limitConfig = config.expensive || { max: 20, windowMs: 15 * 60 * 1000 };
    }

    const result = rateLimiter.checkLimit(clientId, limitConfig.max, limitConfig.windowMs);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': limitConfig.max.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${limitConfig.max} per ${limitConfig.windowMs / 1000} seconds`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        type: 'rate_limit'
      });
    }

    next();
  };
};

/**
 * Usage monitoring middleware
 */
export const usageMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Store original json method to track response size
  const originalJson = res.json;
  res.json = function(data: any) {
    const responseTime = Date.now() - startTime;
    const responseSize = JSON.stringify(data).length;

    // Record metrics
    if (req.path.startsWith('/api/')) {
      const model = req.body?.model || 'unknown';
      const inputSize = JSON.stringify(req.body?.inputs || '').length;
      
      rateLimiter.recordApiCall(model, inputSize, responseSize);
    }

    // Add performance headers
    res.set({
      'X-Response-Time': `${responseTime}ms`,
      'X-Response-Size': responseSize.toString()
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Cleanup task to run periodically
 */
export const startCleanupTask = () => {
  setInterval(() => {
    requestCache.cleanup();
    console.log('Cache cleanup completed', requestCache.getStats());
  }, 10 * 60 * 1000); // Every 10 minutes
};