import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';

interface PriorityDistributionProps {
  immediateCount: number;
  highCount: number;
  phasedCount: number;
  safeCount: number;
  className?: string;
}

export const PriorityDistribution: React.FC<PriorityDistributionProps> = ({
  immediateCount,
  highCount,
  phasedCount,
  safeCount,
  className,
}) => {
  const total = immediateCount + highCount + phasedCount + safeCount;

  const data = [
    { name: 'Immediate', value: immediateCount, color: '#ef4444', label: 'Immediate Evac/Relocate' },
    { name: 'High', value: highCount, color: '#f59e0b', label: 'High Priority Buffer' },
    { name: 'Phased', value: phasedCount, color: '#eab308', label: 'Phased Relocation' },
    { name: 'Safe', value: safeCount, color: '#10b981', label: 'Vetted Resilient / Safe' },
  ];

  interface TooltipPayloadItem {
    payload: {
      name: string;
      value: number;
      color: string;
      label: string;
    };
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-gray-900 border border-gray-700 p-2.5 rounded-lg shadow-xl text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-white">{item.label}</span>
          </div>
          <div className="font-mono text-gray-300">
            {item.value} Habitations ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-md', className)}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-white">Priority Distribution</h4>
        <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
          {total} Total Settlements
        </span>
      </div>

      <div className="relative h-56 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`slice-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-white">{immediateCount}</span>
          <span className="text-[10px] text-red-400 font-semibold tracking-wider uppercase">
            Critical
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-800/80 text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between p-1.5 rounded-md bg-gray-950/40">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-300 truncate">{item.name}</span>
            </div>
            <span className="font-mono font-bold text-white ml-2">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
