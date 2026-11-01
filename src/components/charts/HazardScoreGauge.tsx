import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { cn } from '../../lib/utils';

interface HazardScoreGaugeProps {
  score: number; // 0-100
  title?: string;
  size?: number; // width & height in px
  className?: string;
  sublabel?: string;
  invertColor?: boolean; // if true, higher score is green (safe/capacity)
}

export const HazardScoreGauge: React.FC<HazardScoreGaugeProps> = ({
  score,
  title,
  size = 180,
  className,
  sublabel = 'Risk Index',
  invertColor = false,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Color logic
  const getGaugeColor = (val: number, inverted: boolean) => {
    if (!inverted) {
      if (val >= 80) return '#ef4444'; // red-500
      if (val >= 60) return '#f97316'; // orange-500
      if (val >= 30) return '#facc15'; // yellow-400
      return '#10b981'; // green-500
    } else {
      if (val >= 80) return '#10b981'; // green-500
      if (val >= 60) return '#06b6d4'; // cyan-500
      if (val >= 40) return '#facc15'; // yellow-400
      return '#ef4444'; // red-500
    }
  };

  const color = getGaugeColor(normalizedScore, invertColor);

  const data = [
    {
      name: 'Score',
      value: normalizedScore,
      fill: color,
    },
  ];

  const getStatusText = (val: number, inverted: boolean) => {
    if (!inverted) {
      if (val >= 80) return 'CRITICAL';
      if (val >= 60) return 'ELEVATED';
      if (val >= 30) return 'MODERATE';
      return 'LOW HAZARD';
    } else {
      if (val >= 80) return 'EXCELLENT';
      if (val >= 60) return 'SUITABLE';
      if (val >= 40) return 'MARGINAL';
      return 'DEFICIENT';
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-3', className)}>
      {title && (
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
          {title}
        </span>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            {/* Background track */}
            <RadialBar
              background={{ fill: '#1f2937' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span
            className="text-3xl font-extrabold font-mono tracking-tight transition-colors duration-500"
            style={{ color }}
          >
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">
            {getStatusText(normalizedScore, invertColor)}
          </span>
          <span className="text-[9px] text-gray-500 mt-0.5">{sublabel}</span>
        </div>
      </div>
    </div>
  );
};
