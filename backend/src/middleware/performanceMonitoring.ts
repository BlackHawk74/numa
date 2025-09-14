import { Request, Response, NextFunction } from 'express';
import { usageMonitoringService } from '../services/UsageMonitoringService';

/**
 * Performance metrics for audio processing
 */
interface AudioProcessingMetrics {
  endpoint: string;
  audioSize: number;
  processingTime: number;
  success: boolean;
  errorType?: string;
  timestamp: number;
}

class AudioPerformanceMonitor {
  private metrics: AudioProcessingMetrics[] = [];
  private readonly maxMetrics = 1000;

  /**
   * Record audio processing performance
   */
  recordAudioProcessing(metrics: AudioProcessingMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Record in usage monitoring service
    usageMonitoringService.recordPerformance(
      `audio-${metrics.endpoint}`,
      metrics.processingTime,
      metrics.success
    );

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);
  }

  /**
   * Check for performance threshold violations
   */
  private checkPerformanceThresholds(metrics: AudioProcessingMetrics): void {
    const thresholds = {
      stt: 10000, // 10 seconds for speech-to-text
      tts: 5000,  // 5 seconds for text-to-speech
      therapy: 15000 // 15 seconds for therapy response
    };

    const threshold = thresholds[metrics.endpoint as keyof typeof thresholds] || 10000;
    
    if (metrics.processingTime > threshold) {
      console.warn(`Audio processing performance warning: ${metrics.endpoint} took ${metrics.processingTime}ms (threshold: ${threshold}ms)`, {
        audioSize: metrics.audioSize,
        endpoint: metrics.endpoint,
        timestamp: new Date(metrics.timestamp).toISOString()
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageProcessingTime: number;
    p95ProcessingTime: number;
    successRate: number;
    totalProcessed: number;
    byEndpoint: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
    }>;
  } {
    if (this.metrics.length === 0) {
      return {
        averageProcessingTime: 0,
        p95ProcessingTime: 0,
        successRate: 0,
        totalProcessed: 0,
        byEndpoint: {}
      };
    }

    const processingTimes = this.metrics.map(m => m.processingTime).sort((a, b) => a - b);
    const successCount = this.metrics.filter(m => m.success).length;
    
    const averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const p95Index = Math.floor(processingTimes.length * 0.95);
    const p95ProcessingTime = processingTimes[p95Index] || 0;
    const successRate = successCount / this.metrics.length;

    // Group by endpoint
    const byEndpoint: Record<string, AudioProcessingMetrics[]> = {};
    this.metrics.forEach(metric => {
      if (!byEndpoint[metric.endpoint]) {
        byEndpoint[metric.endpoint] = [];
      }
      byEndpoint[metric.endpoint].push(metric);
    });

    const endpointStats: Record<string, { count: number; averageTime: number; successRate: number }> = {};
    Object.entries(byEndpoint).forEach(([endpoint, metrics]) => {
      const times = metrics.map(m => m.processingTime);
      const successes = metrics.filter(m => m.success).length;
      
      endpointStats[endpoint] = {
        count: metrics.length,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        successRate: successes / metrics.length
      };
    });

    return {
      averageProcessingTime,
      p95ProcessingTime,
      successRate,
      totalProcessed: this.metrics.length,
      byEndpoint: endpointStats
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
}

// Singleton instance
export const audioPerformanceMonitor = new AudioPerformanceMonitor();

/**
 * Middleware to monitor audio processing performance
 */
export const audioProcessingMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Only monitor audio-related endpoints
  const audioEndpoints = ['/api/stt', '/api/tts', '/api/therapy'];
  const isAudioEndpoint = audioEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  if (!isAudioEndpoint) {
    return next();
  }

  const startTime = Date.now();
  const endpoint = req.path.split('/')[2]; // Extract endpoint name (stt, tts, therapy)
  
  // Get audio size from request
  let audioSize = 0;
  if (req.body) {
    if (req.body.audio) {
      audioSize = Buffer.byteLength(req.body.audio);
    } else if (req.file) {
      audioSize = req.file.size;
    } else {
      audioSize = JSON.stringify(req.body).length;
    }
  }

  // Store original json method
  const originalJson = res.json;
  res.json = function(data: any) {
    const processingTime = Date.now() - startTime;
    const success = res.statusCode >= 200 && res.statusCode < 300;
    
    // Record metrics
    audioPerformanceMonitor.recordAudioProcessing({
      endpoint,
      audioSize,
      processingTime,
      success,
      errorType: success ? undefined : `HTTP_${res.statusCode}`,
      timestamp: Date.now()
    });

    // Add performance headers
    res.set({
      'X-Audio-Processing-Time': `${processingTime}ms`,
      'X-Audio-Size': audioSize.toString()
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to add request timing
 */
export const requestTiming = (req: Request, res: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
};

/**
 * Get audio processing performance report
 */
export const getAudioPerformanceReport = () => {
  return audioPerformanceMonitor.getPerformanceStats();
};

/**
 * Clear old audio performance metrics
 */
export const clearOldAudioMetrics = (hours: number = 24) => {
  audioPerformanceMonitor.clearOldMetrics(hours);
};