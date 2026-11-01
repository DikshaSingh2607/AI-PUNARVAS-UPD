import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scale,
  Sparkles,
  X,
  Droplets,
  Truck,
  Building2,
  DollarSign,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { sitesApi } from '../api/endpoints';
import { RelocationSite, SiteStatus } from '../types';
import { HazardScoreGauge } from '../components/charts/HazardScoreGauge';
import { ScoreBar } from '../components/ui/ScoreBar';
import { ShapWaterfallChart } from '../components/charts/ShapWaterfallChart';
import { useMapStore } from '../store/mapStore';
import { cn, formatNumber } from '../lib/utils';
import toast from 'react-hot-toast';

export const SiteAssessment: React.FC = () => {
  const [sites, setSites] = useState<RelocationSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeSite, setActiveSite] = useState<RelocationSite | null>(null);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const { setSelectedSite: setGlobalSelectedSite } = useMapStore();

  const fetchSites = async () => {
    setIsLoading(true);
    try {
      const data = await sitesApi.getAll({
        district: selectedDistrict !== 'All Districts' ? selectedDistrict : undefined,
        minCapacity: minCapacity > 0 ? minCapacity : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as SiteStatus) : undefined,
      });
      setSites(data);
      if (activeSite) {
        const found = data.find((s) => s.id === activeSite.id);
        if (found) setActiveSite(found);
      }
    } catch {
      toast.error('Failed to load candidate sites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [selectedDistrict, minCapacity, selectedStatus]);

  const handleOpenDetail = (site: RelocationSite) => {
    setActiveSite(site);
    setGlobalSelectedSite(site);
  };

  const handleStatusUpdate = async (id: string, newStatus: SiteStatus) => {
    try {
      const updated = await sitesApi.updateStatus(
        id,
        newStatus,
        `Statutory vetting decision executed by Officer.`
      );
      setActiveSite(updated);
      await fetchSites();
      toast.success(`Site status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update site status');
    }
  };

  const toggleCompareSelection = (siteId: string) => {
    if (selectedForCompare.includes(siteId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== siteId));
    } else {
      if (selectedForCompare.length >= 2) {
        // replace second
        setSelectedForCompare([selectedForCompare[0], siteId]);
      } else {
        setSelectedForCompare([...selectedForCompare, siteId]);
      }
    }
  };

  const compareSiteA = sites.find((s) => s.id === selectedForCompare[0]);
  const compareSiteB = sites.find((s) => s.id === selectedForCompare[1]);

  const districtOptions = ['All Districts', 'Wayanad', 'Joshimath', 'Idukki', 'Chamoli', 'Rudraprayag'];
  const statusOptions = ['ALL', 'VETTED', 'UNDER_REVIEW', 'REJECTED'];

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-emerald-400" />
            <span>Relocation Parcel Suitability & Capacity Vetting</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gate 2 suitability: multi-criteria evaluation of potable water yield, geological stability, and social continuity
          </p>
        </div>

        {/* Compare CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedForCompare([]);
            }}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border',
              compareMode
                ? 'bg-blue-600 text-white border-blue-500 shadow-glow-blue'
                : 'bg-gray-900 text-gray-300 border-gray-800 hover:text-white hover:bg-gray-800'
            )}
          >
            <Scale size={16} />
            <span>{compareMode ? 'Exit Compare Mode' : 'Side-by-Side Compare'}</span>
            {selectedForCompare.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 text-[10px] font-bold">
                {selectedForCompare.length}/2
              </span>
            )}
          </button>

          {compareMode && selectedForCompare.length === 2 && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-glow-green animate-bounce"
            >
              Compare Selected (2)
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* District Selector */}
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs">
            <MapPin size={14} className="text-emerald-400" />
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

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
            {statusOptions.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  selectedStatus === st
                    ? 'bg-emerald-600 text-white shadow-glow-green'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                )}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Min Capacity Slider */}
        <div className="flex items-center gap-3 bg-gray-950 px-4 py-2 rounded-xl border border-gray-800 text-xs">
          <Sliders size={14} className="text-gray-400" />
          <span className="text-gray-300 font-medium">Min Suitability Score:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={minCapacity}
            onChange={(e) => setMinCapacity(Number(e.target.value))}
            className="w-32 accent-emerald-500 cursor-pointer"
          />
          <span className="font-mono font-bold text-emerald-400 w-10 text-right">
            {minCapacity}%
          </span>
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sites.map((site) => {
          const isCompared = selectedForCompare.includes(site.id);
          return (
            <div
              key={site.id}
              className={cn(
                'group relative rounded-xl bg-gray-900/70 border transition-all duration-300 p-5 flex flex-col justify-between backdrop-blur-md shadow-lg',
                isCompared
                  ? 'border-blue-500 bg-blue-950/20 shadow-glow-blue'
                  : 'border-gray-800 hover:border-gray-700 hover:bg-gray-900'
              )}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">
                      {site.district}, {site.state} · {site.id}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                      {site.name}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 border',
                      site.status === 'VETTED'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : site.status === 'UNDER_REVIEW'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : 'bg-red-950/80 text-red-300 border-red-500/40'
                    )}
                  >
                    {site.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Score Gauge & Quick Capacity Bar */}
                <div className="flex items-center gap-4 my-3 p-3 rounded-xl bg-gray-950/50 border border-gray-800/60">
                  <HazardScoreGauge
                    score={site.capacityScore}
                    size={110}
                    invertColor={true}
                    sublabel="Suitability"
                  />
                  <div className="flex-1 space-y-2">
                    <ScoreBar
                      value={site.waterAccessScore}
                      label="Water Index"
                      size="sm"
                      invertColor={true}
                    />
                    <ScoreBar
                      value={site.landStabilityScore}
                      label="Land Stability"
                      size="sm"
                      invertColor={true}
                    />
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 px-2 rounded-lg bg-gray-950/50 border border-gray-800/60 text-[11px]">
                  <div>
                    <span className="text-gray-500 block">Area</span>
                    <strong className="text-white font-mono block mt-0.5">
                      {site.areaHectares} ha
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Family Capacity</span>
                    <strong className="text-emerald-400 font-mono block mt-0.5">
                      {site.maxCapacityFamilies}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Road Link</span>
                    <strong className="text-white font-mono block mt-0.5">
                      {site.roadAccessDistanceKm} km
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                {compareMode ? (
                  <button
                    onClick={() => toggleCompareSelection(site.id)}
                    className={cn(
                      'w-full py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 transition-colors',
                      isCompared
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                    )}
                  >
                    <Scale size={14} />
                    <span>{isCompared ? 'Selected for Comparison' : 'Select to Compare'}</span>
                  </button>
                ) : (
                  <>
                    <span className="text-[11px] font-mono text-gray-400">
                      Est: ₹{site.estimatedCostCrores} Cr
                    </span>
                    <button
                      onClick={() => handleOpenDetail(site)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-emerald-600 hover:text-white text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span>Inspect Parcel</span>
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Detail Drawer */}
      {activeSite && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-gray-950 border-l border-gray-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl relative">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                      {activeSite.district}, {activeSite.state}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                      {activeSite.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    {activeSite.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 font-mono">
                    <span>GPS: {activeSite.coordinates[0].toFixed(4)}°N, {activeSite.coordinates[1].toFixed(4)}°E</span>
                    <span>·</span>
                    <span>Area: {activeSite.areaHectares} ha</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSite(null)}
                  className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Suitability Gauge */}
              <div className="my-5 p-4 rounded-xl bg-gray-900/50 border border-gray-800 flex items-center justify-around">
                <HazardScoreGauge
                  score={activeSite.capacityScore}
                  title="Gate 2 Suitability Index"
                  sublabel="Civil & Hazard Ready"
                  size={160}
                  invertColor={true}
                />
                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Legal Title Clearance: <strong className="text-white">{activeSite.legalClearance ? 'Vested & Clear' : 'Pending FRA'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-cyan-400" />
                    <span>Max Capacity: <strong className="text-white">{activeSite.maxCapacityFamilies} Families</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-amber-400" />
                    <span>Est. Development Budget: <strong className="text-white">₹{activeSite.estimatedCostCrores} Cr</strong></span>
                  </div>
                </div>
              </div>

              {/* Individual Multi-Criteria Score Breakdown */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3 mb-6">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Multi-Criteria Gate 2 Assessment Scores
                </h4>
                <ScoreBar value={activeSite.landStabilityScore} label="Geotechnical Bearing & Slope Safety" invertColor={true} />
                <ScoreBar value={activeSite.waterAccessScore} label="Perennial Potable Water Yield" invertColor={true} />
                <ScoreBar value={activeSite.roadScore} label="All-Weather Road Connectivity" invertColor={true} />
                <ScoreBar value={activeSite.livelihoodScore} label="Agricultural & Livelihood Continuity" invertColor={true} />
                <ScoreBar value={activeSite.infrastructureScore} label="Power Grid & School / Health Access" invertColor={true} />
                <ScoreBar value={activeSite.hazardSafetyScore} label="Buffer Distance from Active Red Zones" invertColor={true} />
              </div>

              {/* SHAP Factors Chart */}
              <div className="mb-6">
                <ShapWaterfallChart
                  data={activeSite.shapFactors}
                  title="Site Capacity Attributions (SHAP)"
                  subtitle="Key features determining parcel suitability rating"
                  positiveLabel="+ Supports Relocation"
                  negativeLabel="- Deficit / Constraint"
                />
              </div>

              {/* Verified Site Amenities */}
              <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 mb-6 text-xs space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Inspected Infrastructure & Amenities
                </h4>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {activeSite.amenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-300">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Officer Action Buttons: Vett / Reject */}
            <div className="pt-4 border-t border-gray-800 flex items-center gap-3">
              <button
                onClick={() => handleStatusUpdate(activeSite.id, 'VETTED')}
                disabled={activeSite.status === 'VETTED'}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-glow-green flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                <CheckCircle2 size={16} />
                <span>Vett Site (Certify Gate 2)</span>
              </button>
              <button
                onClick={() => handleStatusUpdate(activeSite.id, 'REJECTED')}
                disabled={activeSite.status === 'REJECTED'}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                <XCircle size={16} />
                <span>Reject Site</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && compareSiteA && compareSiteB && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Scale size={20} className="text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Side-by-Side Candidate Parcel Comparison
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-3 px-4 w-1/3">Evaluation Metric</th>
                    <th className="py-3 px-4 w-1/3 text-emerald-400 font-bold text-sm">
                      {compareSiteA.name}
                    </th>
                    <th className="py-3 px-4 w-1/3 text-cyan-400 font-bold text-sm">
                      {compareSiteB.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80 text-gray-300">
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">District & State</td>
                    <td className="py-2.5 px-4">{compareSiteA.district}, {compareSiteA.state}</td>
                    <td className="py-2.5 px-4">{compareSiteB.district}, {compareSiteB.state}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Overall Gate 2 Suitability</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {compareSiteA.capacityScore}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {compareSiteB.capacityScore}%
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Max Family Capacity</td>
                    <td className="py-2.5 px-4 font-mono font-bold">{compareSiteA.maxCapacityFamilies} families</td>
                    <td className="py-2.5 px-4 font-mono font-bold">{compareSiteB.maxCapacityFamilies} families</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Parcel Area</td>
                    <td className="py-2.5 px-4 font-mono">{compareSiteA.areaHectares} ha</td>
                    <td className="py-2.5 px-4 font-mono">{compareSiteB.areaHectares} ha</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Water Supply Index</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-400">{compareSiteA.waterAccessScore}%</td>
                    <td className="py-2.5 px-4 font-mono text-cyan-400">{compareSiteB.waterAccessScore}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Road Distance to Highway</td>
                    <td className="py-2.5 px-4 font-mono">{compareSiteA.roadAccessDistanceKm} km</td>
                    <td className="py-2.5 px-4 font-mono">{compareSiteB.roadAccessDistanceKm} km</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Geotechnical Stability</td>
                    <td className="py-2.5 px-4 font-mono">{compareSiteA.landStabilityScore}%</td>
                    <td className="py-2.5 px-4 font-mono">{compareSiteB.landStabilityScore}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Legal Title Clearance</td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-400">
                      {compareSiteA.legalClearance ? '✓ Approved' : '✗ Pending'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-400">
                      {compareSiteB.legalClearance ? '✓ Approved' : '✗ Pending'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-gray-400">Estimated Project Cost</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-400">₹{compareSiteA.estimatedCostCrores} Cr</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-400">₹{compareSiteB.estimatedCostCrores} Cr</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
