import React from 'react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

export function LoadingIndicator({ 
  size = 'md', 
  variant = 'spinner', 
  className = '' 
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const dotSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  if (variant === 'spinner') {
    return (
      <div 
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-charcoal rounded-full animate-spin ${className}`}
        role="status"
        aria-label="Loading"
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center space-x-1 ${className}`} role="status" aria-label="Loading">
        <div className={`${dotSizeClasses[size]} bg-charcoal rounded-full animate-bounce`} />
        <div 
          className={`${dotSizeClasses[size]} bg-charcoal rounded-full animate-bounce`}
          style={{ animationDelay: '0.1s' }}
        />
        <div 
          className={`${dotSizeClasses[size]} bg-charcoal rounded-full animate-bounce`}
          style={{ animationDelay: '0.2s' }}
        />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div 
        className={`${sizeClasses[size]} bg-charcoal rounded-full animate-pulse-gentle ${className}`}
        role="status"
        aria-label="Loading"
      />
    );
  }

  return null;
}

export default LoadingIndicator;