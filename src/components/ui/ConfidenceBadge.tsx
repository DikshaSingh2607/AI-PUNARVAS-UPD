import React, { useState } from 'react';
import { ConfidenceLevel } from '../../types';
import { HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  className?: string;
  explanation?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  className,
  explanation,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const configs = {
    HIGH: {
      label: 'High Confidence',
      badgeClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
      icon: <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />,
      defaultTooltip: 'Multi-source satellite SAR, LiDAR slope DTM, and ground sensor data verified (Model error margin < 4.2%).',
    },
    MEDIUM: {
      label: 'Medium Confidence',
      badgeClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
      icon: <AlertCircle size={13} className="text-amber-400 shrink-0" />,
      defaultTooltip: 'Satellite optical & IMD gridded rainfall data calibrated; field borelog ground-truthing recommended.',
    },
    LOW: {
      label: 'Low Confidence',
      badgeClass: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
      icon: <AlertCircle size={13} className="text-rose-400 shrink-0" />,
      defaultTooltip: 'Sparse geotechnical sensor coverage; rapid remote sensing extrapolation requiring urgent field survey.',
    },
  };

  const config = configs[confidence] || configs.HIGH;
  const tooltipText = explanation || config.defaultTooltip;

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium cursor-help transition-colors',
          config.badgeClass,
          className
        )}
      >
        {config.icon}
        <span>{config.label}</span>
        <HelpCircle size={11} className="text-gray-400 ml-0.5 opacity-70" />
      </div>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-gray-200 text-xs rounded-lg border border-gray-700 shadow-xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <span>Model Uncertainty & Lineage</span>
          </div>
          <p className="leading-relaxed text-gray-300 text-[11px]">{tooltipText}</p>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};
