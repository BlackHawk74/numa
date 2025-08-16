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
        return 'text-yellow-600';
      case 'calm':
      case 'peaceful':
        return 'text-therapy-accent';
      default:
        return 'text-gray-600';
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
      <div className="flex-1 overflow-y-auto max-h-96 space-y-4 px-4">
        {recentMessages.map((message: Message) => (
          <div
            key={message.id}
            className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-xs lg:max-w-md px-4 py-3 rounded-2xl
                ${message.speaker === 'user'
                  ? 'bg-therapy-accent text-white rounded-br-sm'
                  : 'bg-therapy-gray text-gray-800 rounded-bl-sm border border-gray-200'
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
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-gray-600">Numa is thinking...</span>
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