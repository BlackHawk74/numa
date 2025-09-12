// Loading states and progress indicators with monochrome styling

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="animate-spin border-2 border-gray-200 border-t-charcoal rounded-full w-full h-full" />
    </div>
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-charcoal rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-charcoal rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-charcoal rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, className = '', showPercentage = false }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 h-1">
        <div 
          className="h-1 bg-charcoal transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-500 mt-1 text-center font-light">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = 'Loading...', 
  progress,
  className = '' 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 ${className}`}>
      <div className="text-center max-w-xs">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-charcoal text-sm font-light mb-4">{message}</p>
        {typeof progress === 'number' && (
          <ProgressBar progress={progress} showPercentage className="w-48" />
        )}
      </div>
    </div>
  );
}

interface ProcessingIndicatorProps {
  isProcessing: boolean;
  message?: string;
  className?: string;
}

export function ProcessingIndicator({ 
  isProcessing, 
  message = 'Processing...', 
  className = '' 
}: ProcessingIndicatorProps) {
  if (!isProcessing) return null;

  return (
    <div className={`flex items-center space-x-3 text-gray-600 ${className}`}>
      <LoadingDots />
      <span className="text-sm font-light">{message}</span>
    </div>
  );
}

interface AudioWaveformProps {
  isActive: boolean;
  className?: string;
}

export function AudioWaveform({ isActive, className = '' }: AudioWaveformProps) {
  const bars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className={`flex items-center justify-center space-x-1 h-8 ${className}`}>
      {bars.map((bar) => (
        <div
          key={bar}
          className={`w-1 bg-charcoal transition-all duration-150 ${
            isActive ? 'animate-pulse' : 'opacity-30'
          }`}
          style={{
            height: isActive ? `${Math.random() * 20 + 8}px` : '8px',
            animationDelay: `${bar * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

interface ConnectionStatusProps {
  isOnline: boolean;
  className?: string;
}

export function ConnectionStatus({ isOnline, className = '' }: ConnectionStatusProps) {
  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-charcoal' : 'bg-gray-400'
        }`} 
      />
      <span className={`font-light ${isOnline ? 'text-charcoal' : 'text-gray-400'}`}>
        {isOnline ? 'Connected' : 'Offline'}
      </span>
    </div>
  );
}

interface RetryIndicatorProps {
  attempt: number;
  maxAttempts: number;
  className?: string;
}

export function RetryIndicator({ attempt, maxAttempts, className = '' }: RetryIndicatorProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center space-x-2 mb-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-600 font-light">
          Retrying... ({attempt}/{maxAttempts})
        </span>
      </div>
      <ProgressBar progress={(attempt / maxAttempts) * 100} className="w-32 mx-auto" />
    </div>
  );
}