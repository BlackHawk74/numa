import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Message } from '../types';

interface ConversationDisplayProps {
  className?: string;
  maxMessages?: number;
}

export function ConversationDisplay({ className = '', maxMessages = 10 }: ConversationDisplayProps) {
  const { state } = useAppContext();
  const { conversationState } = state;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationState.messages]);

  // Get recent messages
  const recentMessages = conversationState.messages.slice(-maxMessages);

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getEmotionColor = (emotion?: string) => {
    switch (emotion?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return 'text-green-600';
      case 'sad':
      case 'sadness':
        return 'text-blue-600';
      case 'angry':
      case 'anger':
        return 'text-red-600';
      case 'anxious':
      case 'anxiety':
      case 'fear':
        return 'text-yellow-600';
      case 'calm':
      case 'peaceful':
        return 'text-therapy-accent';
      case 'surprised':
        return 'text-purple-600';
      case 'disgusted':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEmotionBgColor = (emotion?: string) => {
    switch (emotion?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return 'bg-green-50 border-green-200';
      case 'sad':
      case 'sadness':
        return 'bg-blue-50 border-blue-200';
      case 'angry':
      case 'anger':
        return 'bg-red-50 border-red-200';
      case 'anxious':
      case 'anxiety':
      case 'fear':
        return 'bg-yellow-50 border-yellow-200';
      case 'calm':
      case 'peaceful':
        return 'bg-therapy-blue/10 border-therapy-accent/20';
      case 'surprised':
        return 'bg-purple-50 border-purple-200';
      case 'disgusted':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-therapy-gray border-gray-200';
    }
  };

  const getEmotionIcon = (emotion?: string) => {
    switch (emotion?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return '😊';
      case 'sad':
      case 'sadness':
        return '😢';
      case 'angry':
      case 'anger':
        return '😠';
      case 'anxious':
      case 'anxiety':
        return '😰';
      case 'calm':
      case 'peaceful':
        return '😌';
      default:
        return '';
    }
  };

  // Get current mood from recent messages
  const getCurrentMood = () => {
    const recentUserMessages = recentMessages
      .filter(m => m.speaker === 'user' && m.emotion)
      .slice(-3); // Last 3 user messages
    
    if (recentUserMessages.length === 0) return null;
    
    // Get the most recent emotion
    return recentUserMessages[recentUserMessages.length - 1].emotion;
  };

  const currentMood = getCurrentMood();

  if (recentMessages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">Welcome to Numa</p>
          <p className="text-sm">Start a conversation by holding the microphone button</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Current mood indicator */}
      {currentMood && (
        <div className="flex items-center justify-center mb-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getEmotionBgColor(currentMood)} ${getEmotionColor(currentMood)}`}>
            <span className="mr-1">{getEmotionIcon(currentMood)}</span>
            Current mood: {currentMood}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto max-h-96 space-y-4 px-4">
        {recentMessages.map((message: Message) => (
          <div
            key={message.id}
            className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transition-all duration-300
                ${message.speaker === 'user'
                  ? 'bg-therapy-accent text-white rounded-br-sm'
                  : `text-gray-800 rounded-bl-sm border ${getEmotionBgColor(message.emotion)}`
                }
              `}
            >
              {/* Message content */}
              <p className="text-sm leading-relaxed">{message.content}</p>
              
              {/* Message metadata */}
              <div className={`
                flex items-center justify-between mt-2 text-xs
                ${message.speaker === 'user' ? 'text-blue-100' : 'text-gray-500'}
              `}>
                <span>{formatTime(message.timestamp)}</span>
                
                {/* Emotion indicator for AI messages */}
                {message.speaker === 'numa' && message.emotion && (
                  <div className="flex items-center space-x-1">
                    <span>{getEmotionIcon(message.emotion)}</span>
                    <span className={getEmotionColor(message.emotion)}>
                      {message.emotion}
                    </span>
                  </div>
                )}
                
                {/* Confidence indicator for user messages */}
                {message.speaker === 'user' && message.confidence && (
                  <span className="text-blue-100">
                    {Math.round(message.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Processing indicator */}
        {conversationState.isProcessing && (
          <div className="flex justify-start">
            <div className="bg-therapy-gray text-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-therapy-accent rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-therapy-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-therapy-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-gray-600">Numa is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Audio processing indicator */}
        {state.audioState.isRecording && (
          <div className="flex justify-end">
            <div className="bg-therapy-accent/10 text-therapy-accent px-4 py-3 rounded-2xl rounded-br-sm border border-therapy-accent/20">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-therapy-accent rounded-full animate-pulse" />
                <span className="text-sm">Recording...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Session info */}
      {conversationState.currentSession && (
        <div className="text-center text-xs text-gray-500 border-t pt-2">
          Session started: {new Date(conversationState.currentSession.date).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default ConversationDisplay;