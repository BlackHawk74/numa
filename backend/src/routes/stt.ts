import { Router, Request, Response } from 'express';
import multer from 'multer';
import { speechToTextService } from '../services/SpeechToTextService';

const router = Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (HuggingFace API limit)
  },
  fileFilter: (req, file, cb) => {
    // Check if file is audio
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
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

/**
 * POST /api/stt
 * Convert speech to text using HuggingFace Whisper Large v3 Turbo
 */
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
        message: 'Please upload an audio file'
      });
    }

    // Convert Buffer to ArrayBuffer
    const audioBuffer = new ArrayBuffer(req.file.buffer.length);
    const view = new Uint8Array(audioBuffer);
    for (let i = 0; i < req.file.buffer.length; i++) {
      view[i] = req.file.buffer[i];
    }

    // Validate audio input
    const validation = speechToTextService.validateAudioInput(audioBuffer);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid audio file',
        message: validation.error
      });
    }

    // Extract options from request
    const language = req.body.language || 'en';
    const maxRetries = parseInt(req.body.maxRetries) || 3;

    console.log(`Processing STT request: ${req.file.size} bytes, ${req.file.mimetype}`);

    // Perform speech-to-text conversion
    const result = await speechToTextService.transcribeAudio(audioBuffer, {
      language,
      maxRetries
    });

    if (result.error) {
      return res.status(500).json({
        error: 'Speech-to-text processing failed',
        message: result.error,
        transcription: result.transcription || ''
      });
    }

    // Return successful result
    res.json({
      transcription: result.transcription,
      confidence: result.confidence || 1.0,
      language: language,
      fileSize: req.file.size,
      processingTime: Date.now() - parseInt(req.headers['x-request-start'] as string || '0')
    });

  } catch (error) {
    console.error('STT endpoint error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: 'Audio file must be smaller than 25MB'
        });
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/stt/info
 * Get information about the STT service
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'Speech-to-Text',
    model: 'openai/whisper-large-v3-turbo',
    supportedFormats: speechToTextService.getSupportedFormats(),
    maxFileSize: '25MB',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
    endpoint: '/api/stt'
  });
});

export default router;