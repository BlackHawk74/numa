import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add request start time for performance tracking
 */
export const addRequestStartTime = (req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-start'] = Date.now().toString();
  next();
};

/**
 * Middleware to validate UUID format
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuid || !uuidRegex.test(uuid)) {
      return res.status(400).json({
        error: 'Invalid UUID format',
        message: `${paramName} must be a valid UUID`
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate required fields in request body
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: `The following fields are required: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    next();
  };
};

/**
 * Middleware to validate text length
 */
export const validateTextLength = (fieldName: string, maxLength: number, minLength: number = 1) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const text = req.body[fieldName];
    
    if (typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid field type',
        message: `${fieldName} must be a string`
      });
    }

    if (text.length < minLength) {
      return res.status(400).json({
        error: 'Text too short',
        message: `${fieldName} must be at least ${minLength} characters long`
      });
    }

    if (text.length > maxLength) {
      return res.status(400).json({
        error: 'Text too long',
        message: `${fieldName} must be no more than ${maxLength} characters long`
      });
    }

    next();
  };
};

/**
 * Middleware to sanitize text input
 */
export const sanitizeTextInput = (fieldNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fieldNames.forEach(fieldName => {
      if (req.body[fieldName] && typeof req.body[fieldName] === 'string') {
        // Basic sanitization - remove potentially harmful characters
        req.body[fieldName] = req.body[fieldName]
          .trim()
          .replace(/[<>]/g, '') // Remove angle brackets
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, ''); // Remove event handlers
      }
    });
    
    next();
  };
};

/**
 * Middleware to validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      error: 'Invalid pagination parameter',
      message: 'limit must be a number between 1 and 100'
    });
  }

  if (isNaN(offset) || offset < 0) {
    return res.status(400).json({
      error: 'Invalid pagination parameter',
      message: 'offset must be a non-negative number'
    });
  }

  // Add validated values to request
  req.query.limit = limit.toString();
  req.query.offset = offset.toString();

  next();
};

/**
 * Middleware to validate audio file upload
 */
export const validateAudioFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload an audio file'
    });
  }

  const allowedMimeTypes = [
    'audio/wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/flac',
    'audio/ogg',
    'audio/webm',
    'audio/m4a',
    'audio/x-m4a'
  ];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only audio files are allowed',
      supportedTypes: allowedMimeTypes
    });
  }

  const maxSize = 25 * 1024 * 1024; // 25MB
  if (req.file.size > maxSize) {
    return res.status(413).json({
      error: 'File too large',
      message: 'Audio file must be smaller than 25MB'
    });
  }

  if (req.file.size === 0) {
    return res.status(400).json({
      error: 'Empty file',
      message: 'Audio file cannot be empty'
    });
  }

  next();
};