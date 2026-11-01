import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  trend?: number; // e.g. +12 or -5
  trendLabel?: string;
  accent?: 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'gray';
  subtext?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  accent = 'blue',
  subtext,
  className,
}) => {
  const accentBorderColors = {
    red: 'hover:border-red-500/40 group-hover:text-red-400',
    amber: 'hover:border-amber-500/40 group-hover:text-amber-400',
    green: 'hover:border-emerald-500/40 group-hover:text-emerald-400',
    blue: 'hover:border-blue-500/40 group-hover:text-blue-400',
    purple: 'hover:border-purple-500/40 group-hover:text-purple-400',
    gray: 'hover:border-gray-500/40 group-hover:text-gray-400',
  };

  const iconBackgrounds = {
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const formattedValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-gray-800 bg-gray-900/70 p-5 backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:bg-gray-900/90',
        accentBorderColors[accent],
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110',
            iconBackgrounds[accent]
          )}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <h3 className="text-2xl font-bold tracking-tight text-white font-mono">
          {formattedValue}
        </h3>
        {unit && <span className="text-sm font-medium text-gray-400">{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {trend !== undefined ? (
          <div
            className={cn(
              'flex items-center font-medium gap-1',
              trend > 0 ? 'text-rose-400' : trend < 0 ? 'text-emerald-400' : 'text-gray-400'
            )}
          >
            {trend > 0 ? (
              <ArrowUpRight size={14} />
            ) : trend < 0 ? (
              <ArrowDownRight size={14} />
            ) : (
              <Minus size={14} />
            )}
            <span>{Math.abs(trend)}%</span>
            {trendLabel && <span className="text-gray-500 font-normal ml-0.5">{trendLabel}</span>}
          </div>
        ) : subtext ? (
          <span className="text-gray-400">{subtext}</span>
        ) : null}
      </div>
    </div>
  );
};
