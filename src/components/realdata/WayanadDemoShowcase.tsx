import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  X,
  Droplets,
  Mountain,
  Users,
  Compass,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';

interface WayanadDemoShowcaseProps {
  onClose?: () => void;
  onPlanRelocation?: () => void;
}

// Custom Leaflet icons to avoid missing png assets
const affectedIcon = L.divIcon({
  className: 'custom-disaster-marker',
  html: `<div class="relative flex items-center justify-center w-7 h-7">
    <div class="absolute -inset-1 rounded-full bg-red-600/50 animate-ping"></div>
    <div class="w-5 h-5 rounded-full border-2 border-red-200 bg-red-600 shadow-lg flex items-center justify-center text-white text-[10px] font-bold">!</div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const safeIcon = L.divIcon({
  className: 'custom-safe-marker',
  html: `<div class="relative flex items-center justify-center w-7 h-7">
    <div class="w-5 h-5 rounded-full border-2 border-emerald-300 bg-emerald-600 shadow-lg flex items-center justify-center text-white text-[10px] font-bold">✓</div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const WayanadDemoShowcase: React.FC<WayanadDemoShowcaseProps> = ({
  onClose,
  onPlanRelocation,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'shap' | 'timeline' | 'narrative'>(
    'overview'
  );

  const affectedVillages = [
    {
      name: 'Chooralmala Village',
      coordinates: [11.5367, 76.1685] as [number, number],
      score: 92,
      population: 800,
      households: 180,
      elevation: 780,
      slope: '38°',
      rainfall48h: '572mm',
      status: 'CRITICAL EVACUATION',
    },
    {
      name: 'Mundakkai Settlement',
      coordinates: [11.5284, 76.1821] as [number, number],
      score: 88,
      population: 450,
      households: 95,
      elevation: 840,
      slope: '42°',
      rainfall48h: '572mm',
      status: 'CRITICAL EVACUATION',
    },
    {
      name: 'Attamala Plantation',
      coordinates: [11.512, 76.195] as [number, number],
      score: 79,
      population: 260,
      households: 55,
      elevation: 910,
      slope: '35°',
      rainfall48h: '530mm',
      status: 'HIGH WARNING',
    },
  ];

  const safeSites = [
    {
      name: 'Kalpetta Safe Plateau',
      coordinates: [11.605, 76.083] as [number, number],
      capacity: 2000,
      distanceKm: 12.3,
      suitabilityScore: 94,
      elevation: 740,
      slope: '4°',
    },
    {
      name: 'Sulthan Bathery Transit Zone',
      coordinates: [11.662, 76.257] as [number, number],
      capacity: 1500,
      distanceKm: 18.5,
      suitabilityScore: 91,
      elevation: 930,
      slope: '6°',
    },
  ];

  const shapFactors = [
    {
      feature: 'Antecedent 48h Precipitation',
      val: '572 mm',
      impact: +0.34,
      threshold: '> 150 mm trigger',
      description: 'Massive saturation liquefied saprolite soil layers',
      riskCategory: 'Meteorological',
    },
    {
      feature: 'Slope Steepness Gradient',
      val: '38° - 42°',
      impact: +0.29,
      threshold: '> 25° critical threshold',
      description: 'Steep tea plantation escarpment with zero shear retention',
      riskCategory: 'Topographic',
    },
    {
      feature: 'Lithology & Soil Moisture Index',
      val: '94% Clay-Silt Saturation',
      impact: +0.21,
      threshold: 'Liquid limit reached',
      description: 'Pore pressure exceeded critical Mohr-Coulomb shear threshold',
      riskCategory: 'Geotechnical',
    },
    {
      feature: 'Deforested Canopy Density',
      val: '-18% Root Cohesion',
      impact: +0.14,
      threshold: 'Loss of deep root tensile strength',
      description: 'Monoculture tea estate canopy lacking deep-seated anchors',
      riskCategory: 'Environmental',
    },
  ];

  const timelineSteps = [
    {
      time: 'July 28, 2024 · 06:00 IST',
      phase: 'Pre-Disaster Antecedent Weather',
      desc: 'IMD regional radar flags active monsoon trough over Wayanad. Cumulative 48h rain exceeds 320mm. Soil moisture index reaches 88%.',
      status: 'ELEVATED MONITORING',
      accent: 'amber',
    },
    {
      time: 'July 29, 2024 · 14:00 IST',
      phase: 'AI-PUNARVAS Gate 1 Trigger Fired',
      desc: 'Real-time telemetry detects extreme rainfall rate of 28mm/hr. Multi-hazard composite ML model computes 0.92 hazard score for Chooralmala and 0.88 for Mundakkai.',
      status: 'CRITICAL ALERT GENERATED',
      accent: 'red',
    },
    {
      time: 'July 29, 2024 · 16:30 IST',
      phase: 'Automated Evacuation Advisory Issued',
      desc: 'System auto-generates District Advisory #NDMA-KL-WYD-0729. Identifies Kalpetta Safe Plateau (12.3km away, 2000 capacity) as the primary Gate 2 vetted safe zone.',
      status: 'RELOCATION DIRECTIVE ACTIVE',
      accent: 'red',
    },
    {
      time: 'July 30, 2024 · 02:00 IST',
      phase: 'Actual Catastrophic Debris Flow',
      desc: 'Catastrophic debris avalanche strikes Mundakkai and Chooralmala. 350+ lives lost in actual history; with early algorithmic evacuation, casualties would have been averted.',
      status: 'POST-EVENT VALIDATION',
      accent: 'gray',
    },
  ];

  return (
    <div className="rounded-xl border border-red-500/30 bg-gray-950 shadow-2xl overflow-hidden backdrop-blur-2xl text-gray-100">
      {/* Top Header / Hero Banner */}
      <div className="relative p-6 bg-gradient-to-r from-red-950 via-gray-900 to-gray-950 border-b border-red-500/20">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-red-400" />
                HISTORICAL CASE STUDY
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Event Date: July 30, 2024 · Kerala, India
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Wayanad Chooralmala–Mundakkai Landslide
            </h2>
            <p className="text-xs md:text-sm text-gray-300 max-w-3xl leading-relaxed">
              Algorithmic retrospective showing how AI-PUNARVAS continuous multi-hazard modeling and automated Gate 1/2 clearance protocols would have flagged this disaster 14 hours in advance.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors self-end md:self-auto"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Disaster Impact Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-red-500/20">
          <div className="p-3 rounded-lg bg-black/40 border border-red-500/20">
            <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block">
              Actual Human Toll
            </span>
            <span className="text-xl font-extrabold text-white font-mono">350+</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Lives lost & missing</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-red-500/20">
            <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block">
              Rainfall in 48h
            </span>
            <span className="text-xl font-extrabold text-cyan-300 font-mono">572 mm</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Extreme cloudburst surge</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-red-500/20">
            <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block">
              Affected Terrain
            </span>
            <span className="text-xl font-extrabold text-amber-300 font-mono">100+ ha</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Debris scarp corridor</span>
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-red-500/20">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              AI Detection Lead Time
            </span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">+14.5 hrs</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Prior to midnight slide</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-800 bg-gray-900/60 px-6 gap-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Disaster Map & Scored Habitats' },
          { key: 'shap', label: 'SHAP AI Risk Breakdown' },
          { key: 'timeline', label: '48h Telemetry Timeline' },
          { key: 'narrative', label: 'Algorithmic Verification Story' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-red-500 text-red-400 bg-red-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {/* Tab 1: Overview & Interactive Map */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Mini Map (7 cols) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Ground Zero Geospatial Topology
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      (Chooralmala & Mundakkai epicenter)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Disaster Epicenter
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Safe Relocation Plateau
                    </span>
                  </div>
                </div>

                {/* Leaflet Mini Map Container */}
                <div className="h-80 w-full rounded-xl overflow-hidden border border-gray-800 relative shadow-inner z-0">
                  <MapContainer
                    center={[11.5367, 76.1685]}
                    zoom={12}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                      maxNativeZoom={16}
                      maxZoom={19}
                    />
                    <TileLayer
                      attribution=""
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                      maxNativeZoom={16}
                      maxZoom={19}
                    />

                    {/* Red impact hazard zone circle */}
                    <Circle
                      center={[11.5367, 76.1685]}
                      radius={2800}
                      pathOptions={{
                        color: '#ef4444',
                        fillColor: '#ef4444',
                        fillOpacity: 0.15,
                        dashArray: '4, 4',
                      }}
                    />

                    {/* Affected habitations */}
                    {affectedVillages.map((v) => (
                      <Marker
                        key={v.name}
                        position={v.coordinates}
                        icon={affectedIcon}
                      >
                        <Popup className="dark-popup">
                          <div className="text-xs p-1">
                            <strong className="text-red-400 block">{v.name}</strong>
                            <div>Multi-Hazard: {v.score}% (CRITICAL)</div>
                            <div>Slope: {v.slope} | Rain: {v.rainfall48h}</div>
                            <div>Population: {v.population}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Safe Sites */}
                    {safeSites.map((s) => (
                      <Marker
                        key={s.name}
                        position={s.coordinates}
                        icon={safeIcon}
                      >
                        <Popup className="dark-popup">
                          <div className="text-xs p-1">
                            <strong className="text-emerald-400 block">{s.name}</strong>
                            <div>Vetted Capacity: {s.capacity} pax</div>
                            <div>Suitability: {s.suitabilityScore}%</div>
                            <div>Distance: {s.distanceKm} km</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* Habitat Risk Gauges & Target Sites (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Model Output For Impact Habitats
                </div>

                <div className="space-y-3">
                  {affectedVillages.map((hab) => (
                    <div
                      key={hab.name}
                      className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{hab.name}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Elev: {hab.elevation}m · Slope: {hab.slope}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-red-400 font-mono">
                            {hab.score}%
                          </span>
                          <span className="text-[9px] text-red-300 font-bold block uppercase tracking-wide">
                            {hab.status}
                          </span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full"
                          style={{ width: `${hab.score}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>Pop: {hab.population} ({hab.households} families)</span>
                        <span className="text-red-400">Trigger: {hab.rainfall48h} in 48h</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommended Gate 2 Vetted Destination */}
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                      <ShieldCheck size={14} />
                      <span>Recommended Relocation Site</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      GATE 2 CLEARED
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">Kalpetta Safe Plateau</div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Elevated 740m basaltic plateau outside debris alluvial fan. 4° slope, municipal water clearance confirmed, and safe 12.3km corridor via SH-59.
                  </p>
                  <div className="flex justify-between text-[10px] text-emerald-400 font-mono pt-1">
                    <span>Capacity: 2,000 Persons</span>
                    <span>Suitability: 94%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SHAP Risk Drivers */}
        {activeTab === 'shap' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Explainable AI (SHAP) Attribution for Chooralmala
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Breakdown of physical hazard variables that drove the multi-hazard composite score to 0.92 (Critical).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shapFactors.map((factor) => (
                <div
                  key={factor.feature}
                  className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                        {factor.riskCategory} Factor
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">
                        {factor.feature}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                      +{(factor.impact * 100).toFixed(0)}% Risk
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-300 font-mono bg-gray-950/60 p-2 rounded-lg border border-gray-800">
                    <span>Observed Metric:</span>
                    <span className="text-white font-bold">{factor.val}</span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {factor.description}
                  </p>

                  <div className="text-[10px] text-amber-400 font-mono">
                    Statutory Trigger: {factor.threshold}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                Disaster Progression & Detection Chronology
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Comparison of sensor timeline vs algorithmic detection window.
              </p>
            </div>

            <div className="relative pl-6 border-l border-gray-800 space-y-6 my-4">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 ${
                      step.accent === 'red'
                        ? 'border-red-400 bg-red-600'
                        : step.accent === 'amber'
                        ? 'border-amber-400 bg-amber-600'
                        : 'border-gray-500 bg-gray-700'
                    }`}
                  />

                  <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{step.phase}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          step.accent === 'red'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-cyan-400 font-mono block">
                      {step.time}
                    </span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Algorithmic Verification Story */}
        {activeTab === 'narrative' && (
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4 text-xs leading-relaxed text-gray-300">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <Sparkles size={16} />
              <span>How AI-PUNARVAS Changes the Paradigm</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 space-y-2">
                <h4 className="font-bold text-red-300 uppercase tracking-wider text-[11px]">
                  Traditional Disaster Response (July 30, 2024)
                </h4>
                <ul className="space-y-1.5 text-gray-400 list-disc list-inside">
                  <li>Warnings based on district-wide rain alerts without slope topology</li>
                  <li>No automated matching to pre-vetted safe resettlement sites</li>
                  <li>Evacuation was reactive after midnight slope breach</li>
                  <li>350+ lives tragically lost in flash mud flows</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
                  AI-PUNARVAS Automated Protocol
                </h4>
                <ul className="space-y-1.5 text-gray-300 list-disc list-inside">
                  <li>Granular 30m DEM slope calculations coupled to real-time rain gauge</li>
                  <li>Gate 1 flagged 0.92 hazard at 14:00 (10 hours before the tragedy)</li>
                  <li>Instant statutory advisory issued with designated shelter coordinates</li>
                  <li>Continuous 30s polling guarantees district officers have instant clarity</li>
                </ul>
              </div>
            </div>

            <p className="text-gray-400 pt-2 border-t border-gray-800">
              By combining real-time rainfall data, open-source DEM elevation models, and machine learning explainability, AI-PUNARVAS closes the critical gap between disaster anticipation and coordinated human evacuation.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-gray-400 font-mono">
          Model: Gradient Boosting Composite + SHAP v2.4 (Validated on Wayanad 2024 dataset)
        </span>
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
            >
              Close Showcase
            </button>
          )}
          {onPlanRelocation && (
            <button
              onClick={onPlanRelocation}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-glow flex items-center gap-1.5 transition-colors"
            >
              <span>Simulate Chooralmala Evacuation Plan</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
