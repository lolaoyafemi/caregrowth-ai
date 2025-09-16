import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div 
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          sizeClasses[size],
          className
        )}
        aria-label="Loading"
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;

// Skeleton loaders for different components
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse', className)}>
    <div className="bg-gray-200 rounded-lg p-4 space-y-3">
      <div className="bg-gray-300 h-4 rounded w-3/4"></div>
      <div className="bg-gray-300 h-4 rounded w-1/2"></div>
      <div className="bg-gray-300 h-8 rounded w-full"></div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-300 h-12 flex items-center px-4 space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="bg-gray-400 h-4 rounded flex-1"></div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-t border-gray-300 h-16 flex items-center px-4 space-x-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="bg-gray-300 h-4 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-300 h-10 w-10 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="bg-gray-300 h-4 rounded w-3/4"></div>
            <div className="bg-gray-300 h-3 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);