import { Request, Response, NextFunction } from 'express';
import { DatabaseError } from '../database/connection';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error instanceof DatabaseError) {
    return res.status(500).json({
      error: 'Database error',
      message: error.message,
      type: 'database'
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      type: 'validation'
    });
  }

  // Handle multer errors
  if (error.name === 'MulterError') {
    const multerError = error as any;
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'File too large',
          message: 'Uploaded file exceeds size limit',
          type: 'upload'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'Only one file can be uploaded at a time',
          type: 'upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file',
          message: 'Unexpected file field',
          type: 'upload'
        });
      default:
        return res.status(400).json({
          error: 'Upload error',
          message: multerError.message,
          type: 'upload'
        });
    }
  }

  // Handle HuggingFace API errors
  if (error.message.includes('HuggingFace') || error.message.includes('API')) {
    return res.status(503).json({
      error: 'External service error',
      message: 'AI service is temporarily unavailable',
      type: 'external_service',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Handle network/timeout errors
  if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'External service is temporarily unavailable',
      type: 'network'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    type: 'internal',
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /health/database',
      'POST /api/stt',
      'GET /api/stt/info',
      'POST /api/therapy',
      'GET /api/therapy/info',
      'POST /api/tts',
      'GET /api/tts/info',
      'GET /api/tts/browser-check',
      'GET /api/sessions/:userId',
      'POST /api/sessions',
      'GET /api/sessions/session/:sessionId',
      'PUT /api/sessions/:sessionId',
      'POST /api/sessions/:sessionId/complete',
      'DELETE /api/sessions/:sessionId'
    ]
  });
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log(`${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }

    // Get or create client record
    let clientRecord = requestCounts.get(clientId);
    if (!clientRecord || now > clientRecord.resetTime) {
      clientRecord = { count: 0, resetTime: now + windowMs };
      requestCounts.set(clientId, clientRecord);
    }

    // Check rate limit
    if (clientRecord.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((clientRecord.resetTime - now) / 1000)
      });
    }

    // Increment counter
    clientRecord.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientRecord.count).toString(),
      'X-RateLimit-Reset': new Date(clientRecord.resetTime).toISOString()
    });

    next();
  };
};