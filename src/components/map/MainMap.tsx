import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Habitation, RelocationSite, RedZonePolygon, HazardType } from '../../types';
import { useMapStore } from '../../store/mapStore';
import { PriorityBadge } from '../ui/PriorityBadge';
import { RiskLegend } from './RiskLegend';
import { ScoreBar } from '../ui/ScoreBar';
import { Flame, Droplets, Layers, Maximize2, ShieldAlert, Sparkles, Navigation } from 'lucide-react';
import { cn } from '../../lib/utils';

// Helper controller to handle smooth camera fly-to on store changes
function MapCameraController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [center, zoom, map]);

  return null;
}

// Marker icon generators with custom styling
const createHabitationIcon = (priority: Habitation['priority']) => {
  let colorClass = 'bg-emerald-500 border-emerald-300';
  let pulseHtml = '';

  if (priority === 'IMMEDIATE') {
    colorClass = 'bg-red-500 border-red-200';
    pulseHtml = '<div class="absolute -inset-2 rounded-full bg-red-500/40 animate-ping"></div>';
  } else if (priority === 'HIGH') {
    colorClass = 'bg-amber-500 border-amber-200';
    pulseHtml = '<div class="absolute -inset-1.5 rounded-full bg-amber-500/30 animate-pulse"></div>';
  } else if (priority === 'PHASED') {
    colorClass = 'bg-yellow-500 border-yellow-200';
  }

  const html = `
    <div class="relative flex items-center justify-center w-6 h-6">
      ${pulseHtml}
      <div class="w-4 h-4 rounded-full border-2 ${colorClass} shadow-lg cursor-pointer transform hover:scale-125 transition-transform duration-200"></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-hab-marker',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const createSiteIcon = () => {
  const html = `
    <div class="relative flex items-center justify-center w-7 h-7 cursor-pointer transform hover:scale-125 transition-transform duration-200">
      <div class="absolute -inset-1 rounded-full bg-emerald-500/30 animate-pulse"></div>
      <div class="w-6 h-6 rounded-lg bg-emerald-600 border border-emerald-300 shadow-xl flex items-center justify-center text-white text-[12px] font-bold">
        ★
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-site-marker',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

interface MainMapProps {
  habitations: Habitation[];
  sites: RelocationSite[];
  redZones: RedZonePolygon[];
  height?: string;
  className?: string;
  showLayerToggle?: boolean;
  showLegend?: boolean;
  onHabitationSelect?: (hab: Habitation) => void;
  onSiteSelect?: (site: RelocationSite) => void;
}

export const MainMap: React.FC<MainMapProps> = ({
  habitations,
  sites,
  redZones,
  height = '60vh',
  className,
  showLayerToggle = true,
  showLegend = true,
  onHabitationSelect,
  onSiteSelect,
}) => {
  const {
    activeLayer,
    setActiveLayer,
    mapCenter,
    zoom,
    setSelectedHabitation,
    setSelectedSite,
    resetView,
  } = useMapStore();

  const filteredRedZones = useMemo(() => {
    if (activeLayer === 'combined') return redZones;
    return redZones.filter((rz) => rz.hazardType === activeLayer || rz.hazardType === 'combined');
  }, [redZones, activeLayer]);

  const handleHabitationClick = (hab: Habitation) => {
    setSelectedHabitation(hab);
    if (onHabitationSelect) onHabitationSelect(hab);
  };

  const handleSiteClick = (site: RelocationSite) => {
    setSelectedSite(site);
    if (onSiteSelect) onSiteSelect(site);
  };

  return (
    <div className={cn('relative w-full rounded-2xl overflow-hidden border border-gray-800 shadow-2xl', className)} style={{ height }}>
      {/* Top Floating Layer Controls */}
      {showLayerToggle && (
        <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2 bg-gray-950/85 backdrop-blur-md p-1.5 rounded-xl border border-gray-800 shadow-2xl">
          <button
            onClick={() => setActiveLayer('combined')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              activeLayer === 'combined'
                ? 'bg-red-600 text-white shadow-glow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            )}
          >
            <Layers size={14} />
            <span>Combined Multi-Hazard</span>
          </button>

          <button
            onClick={() => setActiveLayer('landslide')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              activeLayer === 'landslide'
                ? 'bg-amber-600 text-white shadow-glow-amber'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            )}
          >
            <Flame size={14} />
            <span>Landslide & Debris</span>
          </button>

          <button
            onClick={() => setActiveLayer('flood')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              activeLayer === 'flood'
                ? 'bg-blue-600 text-white shadow-glow-blue'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            )}
          >
            <Droplets size={14} />
            <span>Flash Flood Corridors</span>
          </button>
        </div>
      )}

      {/* Top Right Quick Actions */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <button
          onClick={resetView}
          title="Reset Map View"
          className="p-2.5 rounded-xl bg-gray-950/85 backdrop-blur-md border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 shadow-xl transition-colors"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Bottom Right Legend */}
      {showLegend && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <RiskLegend />
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        zoomControl={false}
      >
        <MapCameraController center={mapCenter} zoom={zoom} />

        {/* Esri World Dark Gray Base & Reference (100% Free, No API Key, No Watermark) */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ'
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

        {/* Red Zone Hazard Polygons */}
        {filteredRedZones.map((rz) => (
          <Polygon
            key={rz.id}
            positions={rz.coordinates}
            pathOptions={{
              color: '#dc2626',
              weight: 2,
              fillColor: '#b91c1c',
              fillOpacity: 0.28,
              dashArray: '4, 6',
            }}
          >
            <Popup>
              <div className="p-3 text-xs w-60">
                <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider mb-1">
                  <ShieldAlert size={14} />
                  <span>Delineated Hazard Red Zone</span>
                </div>
                <h4 className="font-semibold text-white text-sm mb-1">{rz.name}</h4>
                <p className="text-gray-300 mb-2">{rz.dominantThreat}</p>
                <div className="flex items-center justify-between text-gray-400 border-t border-gray-800 pt-1.5">
                  <span>District: <strong className="text-white">{rz.district}</strong></span>
                  <span>Area: <strong className="text-white">{rz.areaSqKm} km²</strong></span>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Habitation Risk Markers */}
        {habitations.map((hab) => (
          <Marker
            key={hab.id}
            position={hab.coordinates}
            icon={createHabitationIcon(hab.priority)}
            eventHandlers={{
              click: () => handleHabitationClick(hab),
            }}
          >
            <Popup>
              <div className="p-3.5 text-xs w-64 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-mono">
                      {hab.district}
                    </span>
                    <h4 className="font-bold text-white text-sm leading-tight">
                      {hab.name}
                    </h4>
                  </div>
                  <PriorityBadge priority={hab.priority} size="sm" />
                </div>

                <div className="space-y-1.5 pt-1 border-t border-gray-800">
                  <ScoreBar
                    value={hab.combinedScore}
                    label="Combined Vulnerability Score"
                    size="sm"
                  />
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 pt-1">
                    <div>
                      <span className="text-gray-500 block">Population</span>
                      <strong className="text-white font-mono">{hab.population}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Slope Angle</span>
                      <strong className="text-white font-mono">{hab.slopeAngle}°</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleHabitationClick(hab)}
                  className="w-full mt-2 py-1.5 px-3 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation size={12} />
                  <span>Inspect Assessment Details</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Relocation Sites Markers */}
        {sites.map((site) => (
          <Marker
            key={site.id}
            position={site.coordinates}
            icon={createSiteIcon()}
            eventHandlers={{
              click: () => handleSiteClick(site),
            }}
          >
            <Popup>
              <div className="p-3.5 text-xs w-64 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-mono">
                      {site.district} · Parcel
                    </span>
                    <h4 className="font-bold text-white text-sm leading-tight">
                      {site.name}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                    {site.status}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-gray-800">
                  <ScoreBar
                    value={site.capacityScore}
                    label="Suitability Capacity Index"
                    size="sm"
                    invertColor={true}
                  />
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 pt-1">
                    <div>
                      <span className="text-gray-500 block">Capacity</span>
                      <strong className="text-white font-mono">{site.maxCapacityFamilies} families</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Area</span>
                      <strong className="text-white font-mono">{site.areaHectares} ha</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSiteClick(site)}
                  className="w-full mt-2 py-1.5 px-3 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles size={12} />
                  <span>Evaluate Parcel Capacity</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
