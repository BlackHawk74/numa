import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'line' | 'circle';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ 
  progress, 
  size = 'md', 
  variant = 'line',
  showLabel = false,
  className = '' 
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  if (variant === 'line') {
    return (
      <div className={`w-full ${className}`}>
        {showLabel && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-charcoal uppercase tracking-wide">
              Progress
            </span>
            <span className="text-xs font-mono text-gray-500">
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
        <div className={`w-full bg-gray-200 ${sizeClasses[size]} overflow-hidden`}>
          <div 
            className={`${sizeClasses[size]} bg-charcoal transition-all duration-300 ease-out`}
            style={{ width: `${clampedProgress}%` }}
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    );
  }

  if (variant === 'circle') {
    const radius = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
    const strokeWidth = size === 'sm' ? 2 : size === 'md' ? 3 : 4;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <svg
          className="transform -rotate-90"
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-charcoal transition-all duration-300 ease-out"
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono text-charcoal">
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default ProgressBar;