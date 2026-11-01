import React from 'react';
import { PriorityLevel } from '../../types';
import { AlertTriangle, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  switch (priority) {
    case 'IMMEDIATE':
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-red-500/50 bg-red-950/80 text-red-400 shadow-glow animate-pulse',
            sizeClasses[size],
            className
          )}
        >
          {showIcon && <AlertTriangle size={iconSizes[size]} className="text-red-400 shrink-0" />}
          <span>IMMEDIATE</span>
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-amber-500/50 bg-amber-950/70 text-amber-300 shadow-glow-amber',
            sizeClasses[size],
            className
          )}
        >
          {showIcon && <AlertCircle size={iconSizes[size]} className="text-amber-400 shrink-0" />}
          <span>HIGH PRIORITY</span>
        </span>
      );
    case 'PHASED':
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-950/60 text-yellow-300',
            sizeClasses[size],
            className
          )}
        >
          {showIcon && <Clock size={iconSizes[size]} className="text-yellow-400 shrink-0" />}
          <span>PHASED</span>
        </span>
      );
    case 'SAFE':
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 shadow-glow-green',
            sizeClasses[size],
            className
          )}
        >
          {showIcon && <ShieldCheck size={iconSizes[size]} className="text-emerald-400 shrink-0" />}
          <span>VETTED SAFE</span>
        </span>
      );
  }
};
