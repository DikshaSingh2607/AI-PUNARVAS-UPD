import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  Compass,
  ArrowRight,
  ShieldAlert,
  Flame,
  Droplets,
  Clock,
  X,
  ExternalLink,
} from 'lucide-react';
import { realdataApi } from '../../api/endpoints';
import { CriticalAdvisory } from '../../types';
import { formatDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface CriticalAlertBannerProps {
  onSelectHabitation?: (id: number) => void;
}

export const CriticalAlertBanner: React.FC<CriticalAlertBannerProps> = ({ onSelectHabitation }) => {
  const [advisories, setAdvisories] = useState<CriticalAdvisory[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const navigate = useNavigate();

  const fetchAdvisories = async () => {
    try {
      const data = await realdataApi.getCriticalAdvisories();
      const active = (data || []).filter(
        (a) => a.advisory_type === 'CRITICAL' || a.advisory_type === 'HIGH'
      );
      setAdvisories(active);
    } catch (err) {
      console.error('Failed to fetch critical advisories:', err);
    }
  };

  useEffect(() => {
    fetchAdvisories();
    const interval = setInterval(fetchAdvisories, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isDismissed || advisories.length === 0) {
    return null;
  }

  const activeAdvisory = advisories[currentIndex] || advisories[0];
  const isCritical = advisories.some((a) => a.advisory_type === 'CRITICAL');
  const bannerType = activeAdvisory.advisory_type;

  const isRed = bannerType === 'CRITICAL';
  const themeClasses = isRed
    ? {
        border: 'border-red-500/50',
        bg: 'bg-gradient-to-r from-red-950/90 via-gray-900/95 to-red-950/80',
        glow: 'shadow-[0_0_25px_rgba(239,68,68,0.25)]',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40',
        icon: 'text-red-400',
        pingBg: 'bg-red-400',
        buttonBg: 'bg-red-600 hover:bg-red-500 text-white shadow-glow',
      }
    : {
        border: 'border-amber-500/50',
        bg: 'bg-gradient-to-r from-amber-950/90 via-gray-900/95 to-amber-950/80',
        glow: 'shadow-[0_0_25px_rgba(245,158,11,0.2)]',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: 'text-amber-400',
        pingBg: 'bg-amber-400',
        buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-glow',
      };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`relative rounded-xl border ${themeClasses.border} ${themeClasses.bg} ${themeClasses.glow} backdrop-blur-xl overflow-hidden transition-all duration-300 z-20`}
      >
        {/* Pulsing indicator line */}
        <div
          className={`h-1 w-full ${
            isRed
              ? 'bg-gradient-to-r from-red-600 via-red-400 to-red-600 animate-pulse'
              : 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 animate-pulse'
          }`}
        />

        {/* Main Banner Bar */}
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3.5 min-w-0 flex-1">
            {/* Pulsing Alert Icon */}
            <div className="relative shrink-0 mt-0.5 md:mt-0">
              <span className="relative flex h-4 w-4">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${themeClasses.pingBg} opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${
                    isRed ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${themeClasses.badge} flex items-center gap-1`}
                >
                  {isRed ? <AlertOctagon size={12} /> : <AlertTriangle size={12} />}
                  {activeAdvisory.advisory_type} EVACUATION ADVISORY
                </span>
                {advisories.length > 1 && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    ({currentIndex + 1} of {advisories.length} active advisories)
                  </span>
                )}
              </div>

              {/* Main alert text */}
              <p className="text-sm font-semibold text-white tracking-wide truncate md:whitespace-normal">
                <span className="text-red-300 font-bold">
                  {activeAdvisory.habitation_name}
                </span>{' '}
                <span className="text-gray-300">({activeAdvisory.district})</span> —{' '}
                <span className="text-gray-200">{activeAdvisory.recommended_action}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            {advisories.length > 1 && (
              <div className="flex items-center bg-gray-900/80 border border-gray-700 rounded-lg p-0.5 mr-1">
                <button
                  onClick={() =>
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : advisories.length - 1))
                  }
                  className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  title="Previous advisory"
                >
                  &larr;
                </button>
                <span className="px-2 text-xs text-gray-400 font-mono">
                  {currentIndex + 1}/{advisories.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) => (prev < advisories.length - 1 ? prev + 1 : 0))
                  }
                  className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  title="Next advisory"
                >
                  &rarr;
                </button>
              </div>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 rounded-lg bg-gray-900/90 hover:bg-gray-800 border border-gray-700/80 text-gray-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>{isExpanded ? 'Hide Details' : 'View Full Details'}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              onClick={() => navigate('/relocate')}
              className={`px-3.5 py-1.5 rounded-lg ${themeClasses.buttonBg} text-xs font-semibold flex items-center gap-1.5 transition-colors`}
            >
              <span>Evacuate Now</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800/60 transition-colors"
              title="Dismiss for this session"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Expanded Details Drawer */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-800/80 bg-gray-950/70 p-5 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Location & Coordinates */}
                <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <MapPin size={14} className="text-red-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Target Settlement
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm">
                    {activeAdvisory.habitation_name}
                  </div>
                  <div className="text-gray-400 text-[11px] font-mono mt-0.5">
                    {activeAdvisory.district} · {activeAdvisory.lat.toFixed(4)}°N,{' '}
                    {activeAdvisory.lon.toFixed(4)}°E
                  </div>
                </div>

                {/* Metric 2: Hazard Severity */}
                <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Flame size={14} className="text-amber-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Multi-Hazard Index
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-red-400 font-extrabold text-lg">
                      {(activeAdvisory.multihazard_score * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-red-300 font-semibold uppercase">
                      [CRITICAL THRESHOLD]
                    </span>
                  </div>
                  <div className="text-gray-400 text-[11px] flex items-center gap-1 mt-0.5">
                    <Droplets size={12} className="text-blue-400" />
                    <span>7-day Rain: {activeAdvisory.current_rainfall_7d_mm} mm</span>
                  </div>
                </div>

                {/* Metric 3: Population at Risk */}
                <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Users size={14} className="text-cyan-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      At-Risk Population
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm">
                    {activeAdvisory.population_affected.toLocaleString()} Persons
                  </div>
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    ~{activeAdvisory.households_estimate} Families to Relocate
                  </div>
                </div>

                {/* Metric 4: Safe Destination Site */}
                <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Compass size={14} className="text-emerald-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Designated Safe Site
                    </span>
                  </div>
                  {activeAdvisory.recommended_site ? (
                    <>
                      <div className="text-emerald-300 font-bold text-sm truncate">
                        {activeAdvisory.recommended_site.site_name}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">
                        Distance: {activeAdvisory.recommended_site.distance_km} km · Cap:{' '}
                        {activeAdvisory.recommended_site.capacity} pax
                      </div>
                    </>
                  ) : (
                    <div className="text-amber-400 text-xs">Assigning nearest vetted site...</div>
                  )}
                </div>
              </div>

              {/* Triggers & SHAP factors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                {/* Triggers */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={13} className="text-red-400" />
                    Active Physical Triggers
                  </span>
                  <div className="space-y-1.5">
                    {activeAdvisory.triggers.map((trigger, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-red-950/30 border border-red-500/20 text-red-200 text-xs flex items-start gap-2"
                      >
                        <span className="text-red-400 font-bold">•</span>
                        <span>{trigger}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SHAP Factors */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-400" />
                    ML Model Attribution (SHAP Risk Drivers)
                  </span>
                  <div className="space-y-1.5">
                    {activeAdvisory.shap_reasons?.map((shap, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-gray-900 border border-gray-800 text-gray-300 text-xs flex items-center justify-between"
                      >
                        <span className="font-mono text-cyan-300">{shap.feature}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              shap.impact > 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {shap.impact > 0 ? `+${shap.impact}` : shap.impact} impact
                          </span>
                          <span className="text-[10px] text-gray-500 capitalize">
                            ({shap.direction} risk)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timestamp & Footer */}
              <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-mono">
                  Advisory Generated: {formatDate(activeAdvisory.generated_at)}
                </span>
                <span className="text-red-400 font-semibold animate-pulse">
                  State Disaster Management Authority Directive #NDMA-2024/77B
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
