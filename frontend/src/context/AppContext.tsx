import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AudioState, ConversationState, Message, Session, Goal, User, SpeechPlaybackControls } from '../types';
import { ErrorInfo } from '../utils/errorHandling';

// Initial states
const initialAudioState: AudioState = {
  isRecording: false,
  isPlaying: false,
  hasPermission: false,
  error: undefined,
  isInitialized: false,
  supportedFormats: [],
  currentVoice: undefined,
};

const initialConversationState: ConversationState = {
  messages: [],
  currentSession: undefined,
  isProcessing: false,
  error: undefined,
};

const initialAppState: AppState = {
  user: undefined,
  audioState: initialAudioState,
  conversationState: initialConversationState,
  currentSession: undefined,
  goals: [],
  globalError: undefined,
  isOnline: navigator.onLine,
  retryState: undefined,
};

// Action types
type AppAction =
  | { type: 'SET_USER'; payload: User | undefined }
  | { type: 'SET_AUDIO_PERMISSION'; payload: boolean }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_AUDIO_ERROR'; payload: string | undefined }
  | { type: 'SET_AUDIO_INITIALIZED'; payload: boolean }
  | { type: 'SET_SUPPORTED_FORMATS'; payload: string[] }
  | { type: 'SET_CURRENT_VOICE'; payload: SpeechSynthesisVoice | undefined }
  | { type: 'SET_TTS_CONTROLS'; payload: SpeechPlaybackControls | undefined }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_CONVERSATION_ERROR'; payload: string | undefined }
  | { type: 'SET_CURRENT_SESSION'; payload: Session | undefined }
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'RESET_STATE' }
  | { type: 'SET_GLOBAL_ERROR'; payload: ErrorInfo | undefined }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_RETRY_STATE'; payload: { operation: string; attempt: number; maxAttempts: number } | undefined };

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_AUDIO_PERMISSION':
      return {
        ...state,
        audioState: { ...state.audioState, hasPermission: action.payload },
      };
    
    case 'SET_RECORDING':
      return {
        ...state,
        audioState: { ...state.audioState, isRecording: action.payload },
      };
    
    case 'SET_PLAYING':
      return {
        ...state,
        audioState: { ...state.audioState, isPlaying: action.payload },
      };
    
    case 'SET_AUDIO_ERROR':
      return {
        ...state,
        audioState: { ...state.audioState, error: action.payload },
      };
    
    case 'SET_AUDIO_INITIALIZED':
      return {
        ...state,
        audioState: { ...state.audioState, isInitialized: action.payload },
      };
    
    case 'SET_SUPPORTED_FORMATS':
      return {
        ...state,
        audioState: { ...state.audioState, supportedFormats: action.payload },
      };
    
    case 'SET_CURRENT_VOICE':
      return {
        ...state,
        audioState: { ...state.audioState, currentVoice: action.payload },
      };
    
    case 'SET_TTS_CONTROLS':
      return {
        ...state,
        audioState: { ...state.audioState, ttsControls: action.payload },
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        conversationState: {
          ...state.conversationState,
          messages: [...state.conversationState.messages, action.payload],
        },
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        conversationState: {
          ...state.conversationState,
          isProcessing: action.payload,
        },
      };
    
    case 'SET_CONVERSATION_ERROR':
      return {
        ...state,
        conversationState: {
          ...state.conversationState,
          error: action.payload,
        },
      };
    
    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSession: action.payload,
        conversationState: {
          ...state.conversationState,
          currentSession: action.payload,
        },
      };
    
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        conversationState: {
          ...state.conversationState,
          messages: [],
        },
      };
    
    case 'RESET_STATE':
      return initialAppState;
    
    case 'SET_GLOBAL_ERROR':
      return { ...state, globalError: action.payload };
    
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    
    case 'SET_RETRY_STATE':
      return { ...state, retryState: action.payload };
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;