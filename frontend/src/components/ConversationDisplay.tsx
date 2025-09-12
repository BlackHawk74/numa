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
    // Use varying shades of gray for different emotions in monochrome design
    switch (emotion?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return 'text-gray-700';
      case 'sad':
      case 'sadness':
        return 'text-gray-600';
      case 'angry':
      case 'anger':
        return 'text-charcoal';
      case 'anxious':
      case 'anxiety':
      case 'fear':
        return 'text-gray-500';
      case 'calm':
      case 'peaceful':
        return 'text-gray-600';
      case 'surprised':
        return 'text-gray-500';
      case 'disgusted':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const getEmotionBgColor = (emotion?: string) => {
    // Use subtle gray variations for emotion backgrounds
    switch (emotion?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return 'bg-gray-50 border-gray-200';
      case 'sad':
      case 'sadness':
        return 'bg-gray-50 border-gray-200';
      case 'angry':
      case 'anger':
        return 'bg-gray-100 border-gray-300';
      case 'anxious':
      case 'anxiety':
      case 'fear':
        return 'bg-gray-50 border-gray-200';
      case 'calm':
      case 'peaceful':
        return 'bg-white border-gray-200';
      case 'surprised':
        return 'bg-gray-50 border-gray-200';
      case 'disgusted':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getEmotionIndicator = (emotion?: string) => {
    // Use simple dots or shapes for emotion indicators in monochrome design
    switch (emotion?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return '●';
      case 'sad':
      case 'sadness':
        return '○';
      case 'angry':
      case 'anger':
        return '■';
      case 'anxious':
      case 'anxiety':
        return '△';
      case 'calm':
      case 'peaceful':
        return '◇';
      default:
        return '·';
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
          <p className="text-lg font-light text-charcoal mb-2">Welcome to Numa</p>
          <p className="text-sm text-gray-500">Start a conversation by clicking the microphone</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-6 ${className}`}>
      {/* Current mood indicator */}
      {currentMood && (
        <div className="flex items-center justify-center mb-2">
          <div className={`px-4 py-2 rounded-lg text-xs font-medium border ${getEmotionBgColor(currentMood)} ${getEmotionColor(currentMood)}`}>
            <span className="mr-2 text-base">{getEmotionIndicator(currentMood)}</span>
            <span className="uppercase tracking-wide">Current mood: {currentMood}</span>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto max-h-96 space-y-6">
        {recentMessages.map((message: Message, index) => (
          <div key={message.id}>
            <div className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md ${message.speaker === 'user' ? 'text-right' : 'text-left'}`}>
                {/* Speaker label */}
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  {message.speaker === 'user' ? 'You' : 'Numa'}
                </div>
                
                {/* Message content */}
                <div className={`
                  px-0 py-0 transition-all duration-300
                  ${message.speaker === 'user' ? 'text-charcoal' : 'text-charcoal'}
                `}>
                  <p className="text-base leading-relaxed font-light">{message.content}</p>
                </div>
                
                {/* Message metadata */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>{formatTime(message.timestamp)}</span>
                  
                  {/* Emotion indicator for AI messages */}
                  {message.speaker === 'numa' && message.emotion && (
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{getEmotionIndicator(message.emotion)}</span>
                      <span className={`${getEmotionColor(message.emotion)} uppercase tracking-wide font-medium`}>
                        {message.emotion}
                      </span>
                    </div>
                  )}
                  
                  {/* Confidence indicator for user messages */}
                  {message.speaker === 'user' && message.confidence && (
                    <span className="text-gray-400 font-mono">
                      {Math.round(message.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Subtle divider between messages */}
            {index < recentMessages.length - 1 && (
              <div className="mt-6 border-b border-gray-100"></div>
            )}
          </div>
        ))}
        
        {/* Processing indicator */}
        {conversationState.isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-50 text-charcoal px-0 py-0 border-l-2 border-gray-200 pl-4">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Numa
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-gray-500 font-light">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Audio processing indicator */}
        {state.audioState.isRecording && (
          <div className="flex justify-end">
            <div className="bg-gray-50 text-charcoal px-0 py-0 border-r-2 border-gray-200 pr-4 text-right">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                You
              </div>
              <div className="flex items-center justify-end space-x-3">
                <span className="text-sm text-gray-500 font-light">Recording...</span>
                <div className="w-2 h-2 bg-charcoal rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Session info */}
      {conversationState.currentSession && (
        <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
          <span className="font-mono">
            Session started: {new Date(conversationState.currentSession.date).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default ConversationDisplay;