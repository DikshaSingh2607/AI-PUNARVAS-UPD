import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ShapValue } from '../../types';
import { cn } from '../../lib/utils';
import { Info } from 'lucide-react';

interface ShapWaterfallChartProps {
  data: ShapValue[];
  title?: string;
  subtitle?: string;
  className?: string;
  positiveLabel?: string;
  negativeLabel?: string;
}

export const ShapWaterfallChart: React.FC<ShapWaterfallChartProps> = ({
  data,
  title = 'Explainable AI: SHAP Feature Attributions',
  subtitle = 'Feature impact on relocation vulnerability index (TreeSHAP)',
  className,
  positiveLabel = '+ Increases Risk',
  negativeLabel = '- Mitigates / Buffers',
}) => {
  // Sort data descending by absolute contribution magnitude
  const formattedData = [...data]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6)
    .map((item) => ({
      name: item.displayName,
      rawFeature: item.feature,
      value: parseFloat((item.value * 100).toFixed(1)), // convert to percentage points
      isPositive: item.value >= 0,
      category: item.category || 'geotechnical',
    }));

  interface TooltipPayloadItem {
    payload: {
      name: string;
      value: number;
      category: string;
      isPositive: boolean;
    };
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md">
          <div className="font-semibold text-white mb-1">{item.name}</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400">Category:</span>
            <span className="capitalize text-indigo-400 font-mono">{item.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Impact Delta:</span>
            <span
              className={cn(
                'font-mono font-bold',
                item.isPositive ? 'text-red-400' : 'text-emerald-400'
              )}
            >
              {item.value > 0 ? `+${item.value}%` : `${item.value}%`}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('bg-gray-900/60 border border-gray-800 rounded-xl p-4 backdrop-blur-md', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>{title}</span>
            <Info size={14} className="text-gray-400 cursor-pointer" />
          </h4>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
            {positiveLabel}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            {negativeLabel}
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={formattedData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={['dataMin - 5', 'dataMax + 5']}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fill: '#e5e7eb', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {formattedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPositive ? '#ef4444' : '#10b981'}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
