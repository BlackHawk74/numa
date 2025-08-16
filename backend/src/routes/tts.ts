import { Router, Request, Response } from 'express';
import { textToSpeechService, TextToSpeechService } from '../services/TextToSpeechService';

const router = Router();

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

/**
 * POST /api/tts
 * Convert text to speech using HuggingFace Kokoro 82M (fallback only)
 * Note: This endpoint should only be used when browser Web Speech API is unavailable
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, voice, speed }: TTSRequest = req.body;

    // Validate required fields
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'text is required'
      });
    }

    // Validate text input
    const validation = textToSpeechService.validateTextInput(text);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid text input',
        message: validation.error
      });
    }

    console.log(`Processing TTS fallback request: ${text.length} characters`);

    // Check if browser TTS is available (this is a fallback service)
    if (TextToSpeechService.isBrowserTTSAvailable()) {
      return res.status(200).json({
        message: 'Browser TTS is available, use client-side synthesis instead',
        recommendation: 'Use Web Speech API on the frontend for better performance',
        fallbackUsed: false
      });
    }

    // Perform text-to-speech conversion using HuggingFace
    const result = await textToSpeechService.synthesizeSpeech(text, {
      voice,
      speed
    });

    if (result.error) {
      return res.status(500).json({
        error: 'Text-to-speech processing failed',
        message: result.error
      });
    }

    if (!result.audioBuffer) {
      return res.status(500).json({
        error: 'No audio generated',
        message: 'TTS service did not return audio data'
      });
    }

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': result.audioBuffer.byteLength.toString(),
      'Cache-Control': 'no-cache',
      'X-Fallback-TTS': 'true'
    });

    // Send audio buffer as response
    res.send(Buffer.from(result.audioBuffer));

  } catch (error) {
    console.error('TTS endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/tts/info
 * Get information about the TTS service
 */
router.get('/info', (req: Request, res: Response) => {
  const serviceInfo = textToSpeechService.getServiceInfo();
  
  res.json({
    service: 'Text-to-Speech (Fallback)',
    ...serviceInfo,
    note: 'This service is used as fallback when browser Web Speech API is unavailable',
    recommendation: 'Use browser Web Speech API for better performance and lower latency',
    endpoint: '/api/tts'
  });
});

/**
 * GET /api/tts/browser-check
 * Check if browser TTS is available
 */
router.get('/browser-check', (req: Request, res: Response) => {
  res.json({
    browserTTSAvailable: TextToSpeechService.isBrowserTTSAvailable(),
    availableVoices: TextToSpeechService.getBrowserVoices(),
    recommendation: TextToSpeechService.isBrowserTTSAvailable() 
      ? 'Use browser TTS for better performance'
      : 'Use fallback TTS service'
  });
});

export default router;