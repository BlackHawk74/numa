// Data validation functions for all models

import { 
  SessionStatus, 
  EmotionType 
} from './Session';
import { 
  GoalStatus 
} from './Goal';
import { 
  MessageSpeaker 
} from './Message';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper functions
export const isValidUUID = (uuid: string): boolean => {
  return UUID_REGEX.test(uuid);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

// User validation functions
export const validateCreateUserRequest = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push('Name must be a string');
    } else if (data.name.trim().length === 0) {
      errors.push('Name cannot be empty');
    } else if (data.name.length > 255) {
      errors.push('Name cannot exceed 255 characters');
    }
  }

  if (data.preferences !== undefined) {
    const prefValidation = validateUserPreferences(data.preferences);
    if (!prefValidation.isValid) {
      errors.push(...prefValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUpdateUserRequest = (data: any): ValidationResult => {
  return validateCreateUserRequest(data);
};

export const validateUserPreferences = (preferences: any): ValidationResult => {
  const errors: string[] = [];

  if (typeof preferences !== 'object' || preferences === null) {
    errors.push('Preferences must be an object');
    return { isValid: false, errors };
  }

  // Validate voice_settings
  if (preferences.voice_settings !== undefined) {
    const vs = preferences.voice_settings;
    if (typeof vs !== 'object' || vs === null) {
      errors.push('voice_settings must be an object');
    } else {
      if (vs.preferred_voice !== undefined && typeof vs.preferred_voice !== 'string') {
        errors.push('preferred_voice must be a string');
      }
      if (vs.speech_rate !== undefined && (typeof vs.speech_rate !== 'number' || vs.speech_rate < 0.1 || vs.speech_rate > 3.0)) {
        errors.push('speech_rate must be a number between 0.1 and 3.0');
      }
      if (vs.volume !== undefined && (typeof vs.volume !== 'number' || vs.volume < 0 || vs.volume > 1)) {
        errors.push('volume must be a number between 0 and 1');
      }
    }
  }

  // Validate therapy_settings
  if (preferences.therapy_settings !== undefined) {
    const ts = preferences.therapy_settings;
    if (typeof ts !== 'object' || ts === null) {
      errors.push('therapy_settings must be an object');
    } else {
      if (ts.session_reminder !== undefined && typeof ts.session_reminder !== 'boolean') {
        errors.push('session_reminder must be a boolean');
      }
      if (ts.goal_tracking !== undefined && typeof ts.goal_tracking !== 'boolean') {
        errors.push('goal_tracking must be a boolean');
      }
      if (ts.emotion_tracking !== undefined && typeof ts.emotion_tracking !== 'boolean') {
        errors.push('emotion_tracking must be a boolean');
      }
    }
  }

  // Validate privacy_settings
  if (preferences.privacy_settings !== undefined) {
    const ps = preferences.privacy_settings;
    if (typeof ps !== 'object' || ps === null) {
      errors.push('privacy_settings must be an object');
    } else {
      if (ps.data_retention_days !== undefined && (typeof ps.data_retention_days !== 'number' || ps.data_retention_days < 1)) {
        errors.push('data_retention_days must be a positive number');
      }
      if (ps.analytics_enabled !== undefined && typeof ps.analytics_enabled !== 'boolean') {
        errors.push('analytics_enabled must be a boolean');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Session validation functions
export const validateCreateSessionRequest = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (!data.user_id) {
    errors.push('user_id is required');
  } else if (!isValidUUID(data.user_id)) {
    errors.push('user_id must be a valid UUID');
  }

  if (data.transcript !== undefined && typeof data.transcript !== 'string') {
    errors.push('transcript must be a string');
  }

  if (data.summary !== undefined && typeof data.summary !== 'string') {
    errors.push('summary must be a string');
  }

  if (data.emotion !== undefined && !isValidEmotion(data.emotion)) {
    errors.push('emotion must be a valid emotion type');
  }

  if (data.duration_minutes !== undefined) {
    if (typeof data.duration_minutes !== 'number' || data.duration_minutes < 0) {
      errors.push('duration_minutes must be a non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUpdateSessionRequest = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (data.transcript !== undefined && typeof data.transcript !== 'string') {
    errors.push('transcript must be a string');
  }

  if (data.summary !== undefined && typeof data.summary !== 'string') {
    errors.push('summary must be a string');
  }

  if (data.emotion !== undefined && !isValidEmotion(data.emotion)) {
    errors.push('emotion must be a valid emotion type');
  }

  if (data.duration_minutes !== undefined) {
    if (typeof data.duration_minutes !== 'number' || data.duration_minutes < 0) {
      errors.push('duration_minutes must be a non-negative number');
    }
  }

  if (data.status !== undefined && !isValidSessionStatus(data.status)) {
    errors.push('status must be a valid session status');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isValidSessionStatus = (status: any): status is SessionStatus => {
  return ['active', 'completed', 'cancelled'].includes(status);
};

export const isValidEmotion = (emotion: any): emotion is EmotionType => {
  return [
    'happy', 'sad', 'anxious', 'angry', 'neutral', 
    'excited', 'frustrated', 'hopeful', 'overwhelmed', 'calm'
  ].includes(emotion);
};

// Goal validation functions
export const validateCreateGoalRequest = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (!data.user_id) {
    errors.push('user_id is required');
  } else if (!isValidUUID(data.user_id)) {
    errors.push('user_id must be a valid UUID');
  }

  if (!data.description) {
    errors.push('description is required');
  } else if (typeof data.description !== 'string') {
    errors.push('description must be a string');
  } else if (data.description.trim().length === 0) {
    errors.push('description cannot be empty');
  }

  if (data.target_date !== undefined) {
    if (!(data.target_date instanceof Date) && typeof data.target_date !== 'string') {
      errors.push('target_date must be a Date or ISO string');
    } else {
      const date = new Date(data.target_date);
      if (!isValidDate(date)) {
        errors.push('target_date must be a valid date');
      }
    }
  }

  if (data.progress_notes !== undefined) {
    if (!Array.isArray(data.progress_notes)) {
      errors.push('progress_notes must be an array');
    } else if (!data.progress_notes.every((note: any) => typeof note === 'string')) {
      errors.push('all progress_notes must be strings');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUpdateGoalRequest = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('description must be a string');
    } else if (data.description.trim().length === 0) {
      errors.push('description cannot be empty');
    }
  }

  if (data.status !== undefined && !isValidGoalStatus(data.status)) {
    errors.push('status must be a valid goal status');
  }

  if (data.target_date !== undefined) {
    if (!(data.target_date instanceof Date) && typeof data.target_date !== 'string') {
      errors.push('target_date must be a Date or ISO string');
    } else {
      const date = new Date(data.target_date);
      if (!isValidDate(date)) {
        errors.push('target_date must be a valid date');
      }
    }
  }

  if (data.progress_notes !== undefined) {
    if (!Array.isArray(data.progress_notes)) {
      errors.push('progress_notes must be an array');
    } else if (!data.progress_notes.every((note: any) => typeof note === 'string')) {
      errors.push('all progress_notes must be strings');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isValidGoalStatus = (status: any): status is GoalStatus => {
  return ['active', 'completed', 'cancelled'].includes(status);
};

// Message validation functions
export const validateCreateMessageRequest = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (!data.speaker) {
    errors.push('speaker is required');
  } else if (!isValidMessageSpeaker(data.speaker)) {
    errors.push('speaker must be either "user" or "numa"');
  }

  if (!data.content) {
    errors.push('content is required');
  } else if (typeof data.content !== 'string') {
    errors.push('content must be a string');
  } else if (data.content.trim().length === 0) {
    errors.push('content cannot be empty');
  }

  if (data.emotion !== undefined && typeof data.emotion !== 'string') {
    errors.push('emotion must be a string');
  }

  if (data.confidence !== undefined) {
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      errors.push('confidence must be a number between 0 and 1');
    }
  }

  if (data.session_id !== undefined && !isValidUUID(data.session_id)) {
    errors.push('session_id must be a valid UUID');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isValidMessageSpeaker = (speaker: any): speaker is MessageSpeaker => {
  return ['user', 'numa'].includes(speaker);
};