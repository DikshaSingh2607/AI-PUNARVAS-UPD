import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, HardDrive, Info } from 'lucide-react';
import { realdataApi } from '../../api/endpoints';
import { BufferStatus } from '../../types';
import { cn } from '../../lib/utils';

interface BufferStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const BufferStatusIndicator: React.FC<BufferStatusIndicatorProps> = ({
  className,
  compact = false,
}) => {
  const [status, setStatus] = useState<BufferStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true);
      const data = await realdataApi.getBufferStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch buffer status:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Auto-refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const current = status?.current_count ?? 26;
  const max = status?.max_buffer ?? 200;
  const pct = Math.min(100, Math.round((current / max) * 100));

  // Color logic: green <60%, amber 60-85%, red >85%
  let strokeColor = '#10b981'; // emerald-500
  let textColorClass = 'text-emerald-400';
  let badgeBgClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  let accentClass = 'emerald';

  if (pct > 85) {
    strokeColor = '#ef4444'; // red-500
    textColorClass = 'text-red-400';
    badgeBgClass = 'bg-red-500/10 border-red-500/20 text-red-400';
    accentClass = 'red';
  } else if (pct >= 60) {
    strokeColor = '#f59e0b'; // amber-500
    textColorClass = 'text-amber-400';
    badgeBgClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    accentClass = 'amber';
  }

  // SVG circular ring calculations
  const size = compact ? 36 : 48;
  const strokeWidth = compact ? 3.5 : 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/70 backdrop-blur-md transition-all duration-200 hover:border-gray-700 hover:bg-gray-900/90 cursor-pointer',
          compact ? 'px-3 py-1.5' : 'p-3.5 w-full'
        )}
      >
        {/* Circular Progress Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#1f2937"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Inner percentage or database icon */}
          <span className="absolute text-[10px] font-bold font-mono text-gray-200">
            {pct}%
          </span>
        </div>

        {/* Labels */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <Database size={13} className={textColorClass} />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Rolling Buffer
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchStatus();
              }}
              title="Refresh buffer status"
              className="p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw
                size={11}
                className={cn(isRefreshing && 'animate-spin text-cyan-400')}
              />
            </button>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-white font-mono">
              {current}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              / {max} records
            </span>
            <span
              className={cn(
                'ml-1 text-[10px] px-1.5 py-0.2 rounded font-semibold border',
                badgeBgClass
              )}
            >
              {pct < 60 ? 'Optimal' : pct <= 85 ? 'Elevated' : 'Near Limit'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Tooltip / Breakdown Card */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-gray-950/95 border border-gray-700/80 shadow-2xl p-4 z-50 backdrop-blur-xl text-xs space-y-3 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-1.5">
              <HardDrive size={14} className="text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                FIFO Village Buffer Status
              </span>
            </div>
            <span className="font-mono text-[10px] text-gray-400">
              {pct}% Utilized
            </span>
          </div>

          <p className="text-[11px] text-gray-300 leading-relaxed">
            Maintains up to {max} live habitations across target districts. Oldest inactive records are automatically cycled when new telemetry streams in.
          </p>

          {/* District Breakdown */}
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Habitations By District:
            </span>
            <div className="space-y-1.5">
              {status?.by_district && Object.keys(status.by_district).length > 0 ? (
                Object.entries(status.by_district).map(([dist, count]) => {
                  const distPct = Math.round((count / current) * 100) || 0;
                  return (
                    <div key={dist} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-200">{dist}</span>
                        <span className="font-mono text-cyan-300 font-medium">
                          {count} ({distPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full transition-all"
                          style={{ width: `${distPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 text-[11px]">No district breakdown available</div>
              )}
            </div>
          </div>

          {/* Dates metadata */}
          <div className="pt-2 border-t border-gray-800 text-[10px] text-gray-400 space-y-0.5 font-mono">
            <div>Oldest Record: {status?.oldest_record_date || '2024-01-15'}</div>
            <div>Newest Record: {new Date(status?.newest_record_date || Date.now()).toLocaleDateString()}</div>
          </div>
        </div>
      )}
    </div>
  );
};
