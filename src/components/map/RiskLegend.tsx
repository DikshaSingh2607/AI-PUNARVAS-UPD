import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export const RiskLegend: React.FC<{ className?: string }> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        'glass-panel rounded-xl shadow-2xl overflow-hidden border border-gray-800 transition-all duration-300 w-64',
        className
      )}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gray-900/90 cursor-pointer select-none border-b border-gray-800 hover:bg-gray-800/60"
      >
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-red-400" />
          <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
            Map Legend
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-3 text-xs space-y-3 bg-gray-950/80 backdrop-blur-md">
          {/* Habitation Risk Categories */}
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider flex items-center justify-between">
              <span>Settlement Priorities</span>
              <Info size={11} className="text-gray-500" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-gray-300">Immediate</span>
                </div>
                <span className="text-[11px] font-mono text-red-400">Score &gt; 85</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="text-gray-300">High Priority</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400">Score 70-85</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" />
                  <span className="text-gray-300">Phased Relocation</span>
                </div>
                <span className="text-[11px] font-mono text-yellow-400">Score 50-70</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-gray-300">Vetted Safe</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">Score &lt; 50</span>
              </div>
            </div>
          </div>

          {/* Relocation Sites */}
          <div className="pt-2 border-t border-gray-800">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider">
              Relocation Parcels
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-gray-950 font-bold">
                  ★
                </span>
                <span className="text-gray-300">Candidate Site</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Vetted</span>
            </div>
          </div>

          {/* Hazard Zones */}
          <div className="pt-2 border-t border-gray-800">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider">
              Hazard Zones
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 rounded border border-red-500 bg-red-950/60 inline-block" />
              <span className="text-gray-300">Critical Red Zone Polygon</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
