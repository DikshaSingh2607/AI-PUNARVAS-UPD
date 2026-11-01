import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Users,
  MapPin,
  Mountain,
  Compass,
  CloudRain,
  X,
  FilePlus,
  RefreshCw,
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { habitationsApi } from '../api/endpoints';
import { Habitation, PriorityLevel } from '../types';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { ScoreBar } from '../components/ui/ScoreBar';
import { HazardScoreGauge } from '../components/charts/HazardScoreGauge';
import { ShapWaterfallChart } from '../components/charts/ShapWaterfallChart';
import { useDebounce } from '../hooks/useDebounce';
import { useMapStore } from '../store/mapStore';
import { cn, formatDate, formatNumber } from '../lib/utils';
import toast from 'react-hot-toast';

export const Habitations: React.FC = () => {
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [activeHabitation, setActiveHabitation] = useState<Habitation | null>(null);
  const [isRescoring, setIsRescoring] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { setSelectedHabitation: setGlobalSelectedHab } = useMapStore();
  const navigate = useNavigate();

  const fetchHabitations = async () => {
    setIsLoading(true);
    try {
      const data = await habitationsApi.getAll({
        district: selectedDistrict !== 'All Districts' ? selectedDistrict : undefined,
        priority: selectedPriority !== 'ALL' ? (selectedPriority as PriorityLevel) : undefined,
        search: debouncedSearch || undefined,
      });
      setHabitations(data);
      // If activeHabitation is set, update it from fresh data
      if (activeHabitation) {
        const found = data.find((h) => h.id === activeHabitation.id);
        if (found) setActiveHabitation(found);
      }
    } catch {
      toast.error('Failed to load settlements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabitations();
  }, [debouncedSearch, selectedPriority, selectedDistrict]);

  const handleOpenDetail = (hab: Habitation) => {
    setActiveHabitation(hab);
    setGlobalSelectedHab(hab);
  };

  const handleRescore = async (id: string) => {
    setIsRescoring(true);
    try {
      const updated = await habitationsApi.rescore(id);
      setActiveHabitation(updated);
      await fetchHabitations();
      toast.success(`Recalculated AI risk model for ${updated.name} with updated InSAR raster.`);
    } catch {
      toast.error('Rescore failed');
    } finally {
      setIsRescoring(false);
    }
  };

  const handleCreatePlan = (hab: Habitation) => {
    navigate('/relocate', { state: { createForHabitationId: hab.id } });
  };

  const priorityOptions = ['ALL', 'IMMEDIATE', 'HIGH', 'PHASED', 'SAFE'];
  const districtOptions = ['All Districts', 'Wayanad', 'Joshimath', 'Idukki', 'Chamoli', 'Rudraprayag'];

  return (
    <div className="relative space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert size={22} className="text-red-500" />
            <span>Habitation Risk Assessment Registry</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Continuous InSAR deformation tracking, landslide runout physics, and vulnerability ranking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800">
            {habitations.length} Habitations Listed
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search habitation name, district, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controls: District & Priority Filter Chips */}
        <div className="flex flex-wrap items-center gap-3">
          {/* District Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs">
            <MapPin size={14} className="text-red-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {districtOptions.map((d) => (
                <option key={d} value={d} className="bg-gray-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Chips */}
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800 overflow-x-auto">
            {priorityOptions.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                  selectedPriority === p
                    ? 'bg-red-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Habitations Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-xl bg-gray-900/60 border border-gray-800" />
          ))}
        </div>
      ) : habitations.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-gray-900/40 border border-gray-800">
          <ShieldAlert size={36} className="mx-auto text-gray-500 mb-3" />
          <h4 className="text-sm font-semibold text-white">No settlements found</h4>
          <p className="text-xs text-gray-400 mt-1">Try modifying the search filter or priority parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {habitations.map((hab) => (
            <div
              key={hab.id}
              className="group relative rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 hover:bg-gray-900 transition-all duration-300 p-5 flex flex-col justify-between backdrop-blur-md shadow-lg"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                      {hab.district}, {hab.state} · {hab.id}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors leading-snug">
                      {hab.name}
                    </h3>
                  </div>
                  <PriorityBadge priority={hab.priority} size="sm" />
                </div>

                {/* Score Bars */}
                <div className="space-y-2.5 my-4 pt-3 border-t border-gray-800/80">
                  <ScoreBar
                    value={hab.combinedScore}
                    label="Combined Vulnerability Score"
                    size="md"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <ScoreBar
                      value={hab.landslideScore}
                      label="Landslide"
                      size="sm"
                    />
                    <ScoreBar
                      value={hab.floodScore}
                      label="Flood"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Geotechnical Quick Specs */}
                <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-lg bg-gray-950/50 border border-gray-800/60 text-[11px]">
                  <div>
                    <span className="text-gray-500 flex items-center gap-1">
                      <Users size={12} /> Citizens
                    </span>
                    <strong className="text-white font-mono block mt-0.5">
                      {formatNumber(hab.population)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 flex items-center gap-1">
                      <Mountain size={12} /> Slope
                    </span>
                    <strong className="text-white font-mono block mt-0.5">
                      {hab.slopeAngle}°
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 flex items-center gap-1">
                      <CloudRain size={12} /> 7d Rain
                    </span>
                    <strong className="text-white font-mono block mt-0.5">
                      {hab.rainfallAvg7d} mm
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                <ConfidenceBadge confidence={hab.confidence} />
                <button
                  onClick={() => handleOpenDetail(hab)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-red-600 hover:text-white text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>View Details</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-Over Detail Drawer (Right Side) */}
      {activeHabitation && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-gray-950 border-l border-gray-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl relative">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                      {activeHabitation.district}, {activeHabitation.state}
                    </span>
                    <PriorityBadge priority={activeHabitation.priority} size="sm" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    {activeHabitation.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 font-mono">
                    <span>GPS: {activeHabitation.coordinates[0].toFixed(4)}°N, {activeHabitation.coordinates[1].toFixed(4)}°E</span>
                    <span>·</span>
                    <span>Elev: {activeHabitation.elevation}m</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveHabitation(null)}
                  className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status and Last Assessed */}
              <div className="flex items-center justify-between py-3 border-b border-gray-800/80 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-emerald-400" />
                  <span>Assessed: {formatDate(activeHabitation.lastAssessed)}</span>
                </div>
                <button
                  onClick={() => handleRescore(activeHabitation.id)}
                  disabled={isRescoring}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} className={cn(isRescoring && 'animate-spin')} />
                  <span>{isRescoring ? 'Rescoring...' : 'Rescore Model'}</span>
                </button>
              </div>

              {/* Dual Radial Gauges */}
              <div className="grid grid-cols-2 gap-4 my-5 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
                <HazardScoreGauge
                  score={activeHabitation.landslideScore}
                  title="Landslide Risk"
                  sublabel="Slope & Debris"
                  size={150}
                />
                <HazardScoreGauge
                  score={activeHabitation.floodScore}
                  title="Flood Index"
                  sublabel="River Basin Surge"
                  size={150}
                />
              </div>

              {/* Demographics & Critical Indicators */}
              <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Total Population</span>
                  <strong className="text-white font-mono text-base">
                    {formatNumber(activeHabitation.population)}
                  </strong>
                  <span className="text-[10px] text-gray-500 block">
                    {activeHabitation.households} households
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Vulnerable Pop</span>
                  <strong className="text-amber-400 font-mono text-base">
                    {formatNumber(activeHabitation.vulnerablePopulation)}
                  </strong>
                  <span className="text-[10px] text-gray-500 block">Elderly & Children</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-gray-400 block mb-0.5">Soil Stability</span>
                  <strong
                    className={cn(
                      'font-mono text-xs block truncate mt-1',
                      activeHabitation.soilStability === 'HIGHLY_UNSTABLE'
                        ? 'text-red-400'
                        : 'text-amber-400'
                    )}
                  >
                    {activeHabitation.soilStability.replace('_', ' ')}
                  </strong>
                  <span className="text-[10px] text-gray-500 block">
                    River dist: {activeHabitation.distanceToRiverMeters}m
                  </span>
                </div>
              </div>

              {/* Explainable AI: SHAP Waterfall Chart */}
              <div className="mb-6">
                <ShapWaterfallChart
                  data={activeHabitation.shapValues}
                  title="SHAP Vulnerability Factor Breakdown"
                  subtitle="Algorithmic features driving relocation mandate"
                />
              </div>

              {/* Model Confidence & Ground Truthing Note */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 mb-6 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Sensor Confidence Level</span>
                  <ConfidenceBadge confidence={activeHabitation.confidence} />
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Calculated using calibrated Sentinel InSAR interferometry, 1m LiDAR DEM slope maps, and real-time AWS tipping-bucket rainfall gauges.
                </p>
              </div>
            </div>

            {/* Bottom Actions CTA */}
            <div className="pt-4 border-t border-gray-800 flex items-center gap-3">
              <button
                onClick={() => handleCreatePlan(activeHabitation)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center gap-2 transition-all"
              >
                <FilePlus size={16} />
                <span>Create Relocation Plan</span>
              </button>
              <button
                onClick={() => setActiveHabitation(null)}
                className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
