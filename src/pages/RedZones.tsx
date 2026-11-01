import React, { useState, useEffect } from 'react';
import {
  Flame,
  Droplets,
  Layers,
  MapPin,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { MainMap } from '../components/map/MainMap';
import { useMapData } from '../hooks/useMapData';
import { useMapStore } from '../store/mapStore';
import { HazardType, DistrictSummary } from '../types';
import { hazardsApi } from '../api/endpoints';
import { ScoreBar } from '../components/ui/ScoreBar';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const RedZones: React.FC = () => {
  const { habitations, sites, redZones } = useMapData();
  const { activeLayer, setActiveLayer, setSelectedDistrict, selectedDistrict } = useMapStore();
  const [districtSummaries, setDistrictSummaries] = useState<DistrictSummary[]>([]);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSummaries() {
      const data = await hazardsApi.getRiskSummary();
      setDistrictSummaries(data);
    }
    loadSummaries();
  }, []);

  const handleDistrictHover = (districtName: string) => {
    setHoveredDistrict(districtName);
  };

  const handleDistrictClick = (districtName: string) => {
    setSelectedDistrict(districtName);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900/60 border border-gray-800 p-4 rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" />
            <span>Hazard Red Zones & Critical Corridor Explorer</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cartographic boundaries derived from satellite InSAR creep data, runoff models, and DEM slope analysis
          </p>
        </div>

        {/* Layer Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-950 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveLayer('combined')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeLayer === 'combined'
                ? 'bg-red-600 text-white shadow-glow'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <Layers size={14} />
            <span>Combined</span>
          </button>

          <button
            onClick={() => setActiveLayer('landslide')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeLayer === 'landslide'
                ? 'bg-amber-600 text-white shadow-glow-amber'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <Flame size={14} />
            <span>Landslide</span>
          </button>

          <button
            onClick={() => setActiveLayer('flood')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeLayer === 'flood'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <Droplets size={14} />
            <span>Flash Flood</span>
          </button>
        </div>
      </div>

      {/* Map (50vh) */}
      <div className="relative">
        <MainMap
          habitations={habitations}
          sites={sites}
          redZones={redZones}
          height="50vh"
          showLayerToggle={false}
        />
        {hoveredDistrict && (
          <div className="absolute top-4 left-4 z-[1000] px-3 py-1.5 rounded-lg bg-gray-950/90 border border-red-500/50 text-white text-xs backdrop-blur-md shadow-xl flex items-center gap-2">
            <MapPin size={14} className="text-red-400 animate-bounce" />
            <span>Focused on: <strong className="text-red-300">{hoveredDistrict}</strong></span>
          </div>
        )}
      </div>

      {/* Bottom Section: Risk Summary Cards Per District */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              District Vulnerability Breakdown & Relocation Readiness
            </h3>
            <p className="text-xs text-gray-400">
              Hover over a district to isolate coordinates. Click to filter active workspace.
            </p>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {districtSummaries.length} High-Risk Districts Monitored
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {districtSummaries.map((dist) => {
            const isSelected = selectedDistrict === dist.district;
            return (
              <div
                key={dist.district}
                onMouseEnter={() => handleDistrictHover(dist.district)}
                onMouseLeave={() => setHoveredDistrict(null)}
                onClick={() => handleDistrictClick(dist.district)}
                className={cn(
                  'cursor-pointer rounded-xl p-4 border transition-all duration-300 relative bg-gray-900/70 hover:bg-gray-800/80 backdrop-blur-md',
                  isSelected
                    ? 'border-red-500/80 shadow-glow bg-gray-900'
                    : 'border-gray-800 hover:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={15} className="text-red-400 shrink-0" />
                    <h4 className="font-bold text-white text-sm">{dist.district}</h4>
                  </div>
                  {dist.immediateCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-500/40 text-[10px] font-mono font-bold text-red-300 animate-pulse">
                      {dist.immediateCount} Evac
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                      Stable
                    </span>
                  )}
                </div>

                <div className="space-y-2 mt-3 pt-2 border-t border-gray-800/80">
                  <ScoreBar
                    value={dist.avgLandslideScore}
                    label="Landslide Risk"
                    size="sm"
                  />
                  <ScoreBar
                    value={dist.avgFloodScore}
                    label="Flood Risk"
                    size="sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-800/80 text-[11px] text-gray-400">
                  <div>
                    <span>Habitations:</span>
                    <strong className="text-white block font-mono">
                      {dist.habitationsCount}
                    </strong>
                  </div>
                  <div>
                    <span>Sites Ready:</span>
                    <strong className="text-emerald-400 block font-mono">
                      {dist.sitesCount}
                    </strong>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400 group">
                  <span className="text-gray-500 font-mono">Composite: {Math.round(dist.avgCombinedScore)}%</span>
                  <span className="text-red-400 font-medium flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
