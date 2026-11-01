import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { DistrictSummary } from '../../types';
import { cn } from '../../lib/utils';

interface DistrictRiskBarProps {
  data: DistrictSummary[];
  className?: string;
}

export const DistrictRiskBar: React.FC<DistrictRiskBarProps> = ({ data, className }) => {
  const chartData = data.map((d) => ({
    name: d.district,
    flood: Math.round(d.avgFloodScore),
    landslide: Math.round(d.avgLandslideScore),
    immediate: d.immediateCount,
  }));

  interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
    payload: {
      name: string;
      flood: number;
      landslide: number;
      immediate: number;
    };
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md">
          <div className="font-semibold text-white mb-2">{label} District</div>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Flood Risk:
            </span>
            <span className="font-mono font-bold text-white">{payload[0].value}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Landslide Risk:
            </span>
            <span className="font-mono font-bold text-white">{payload[1]?.value}%</span>
          </div>
          <div className="border-t border-gray-800 pt-1 mt-1 flex items-center justify-between text-gray-400">
            <span>Critical Habitations:</span>
            <span className="font-mono text-red-400 font-bold">{payload[0].payload.immediate}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-md', className)}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white">District Hazard Index Comparison</h4>
          <p className="text-xs text-gray-400 mt-0.5">Average Flood vs. Landslide susceptibility</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            barGap={4}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-xs text-gray-300 font-medium capitalize">
                  {value === 'flood' ? 'Flood Vulnerability' : 'Landslide / Debris Hazard'}
                </span>
              )}
            />
            <Bar
              dataKey="flood"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="landslide"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
