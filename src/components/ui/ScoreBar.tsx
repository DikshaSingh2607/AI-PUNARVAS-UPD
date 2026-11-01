import React from 'react';
import { cn } from '../../lib/utils';

interface ScoreBarProps {
  value: number; // 0 to 100
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  invertColor?: boolean; // if true, higher score is green (e.g., site capacity), false means higher score is red (risk)
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  value,
  label,
  showValue = true,
  size = 'md',
  className,
  invertColor = false,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  // Determine color based on value and whether high is good or dangerous
  const getColorClass = (val: number, inverted: boolean) => {
    if (!inverted) {
      // Risk mode: higher = dangerous (red)
      if (val >= 80) return 'from-red-600 to-rose-500 text-rose-400';
      if (val >= 60) return 'from-amber-600 to-orange-500 text-amber-400';
      if (val >= 35) return 'from-yellow-600 to-amber-500 text-yellow-400';
      return 'from-emerald-600 to-teal-500 text-emerald-400';
    } else {
      // Capacity/Suitability mode: higher = good (green)
      if (val >= 80) return 'from-emerald-600 to-teal-400 text-emerald-400';
      if (val >= 60) return 'from-blue-600 to-cyan-400 text-cyan-400';
      if (val >= 40) return 'from-amber-600 to-yellow-400 text-amber-400';
      return 'from-red-600 to-rose-500 text-rose-400';
    }
  };

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const colorStyles = getColorClass(clampedValue, invertColor);
  const barGradient = colorStyles.split(' ')[0] + ' ' + colorStyles.split(' ')[1];
  const textColor = colorStyles.split(' ')[2];

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs mb-1.5">
          {label && <span className="text-gray-300 font-medium">{label}</span>}
          {showValue && (
            <span className={cn('font-mono font-semibold ml-auto', textColor)}>
              {clampedValue}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-900 rounded-full overflow-hidden p-0.5 border border-gray-800', heightClasses[size])}>
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out', barGradient)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};
