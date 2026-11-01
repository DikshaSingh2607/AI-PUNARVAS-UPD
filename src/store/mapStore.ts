import { create } from 'zustand';
import { HazardType, Habitation, RelocationSite } from '../types';

interface MapState {
  activeLayer: HazardType;
  selectedHabitation: Habitation | null;
  selectedSite: RelocationSite | null;
  mapCenter: [number, number]; // [lat, lng]
  zoom: number;
  selectedDistrict: string;
  setActiveLayer: (layer: HazardType) => void;
  setSelectedHabitation: (habitation: Habitation | null) => void;
  setSelectedSite: (site: RelocationSite | null) => void;
  setMapCenter: (center: [number, number], zoom?: number) => void;
  setZoom: (zoom: number) => void;
  setSelectedDistrict: (district: string) => void;
  resetView: () => void;
}

// Default center: South India / Wayanad focus, zoom level 11
const DEFAULT_CENTER: [number, number] = [11.55, 76.12];
const DEFAULT_ZOOM = 11;

export const useMapStore = create<MapState>((set) => ({
  activeLayer: 'combined',
  selectedHabitation: null,
  selectedSite: null,
  mapCenter: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  selectedDistrict: 'All Districts',

  setActiveLayer: (activeLayer) => set({ activeLayer }),

  setSelectedHabitation: (habitation) => {
    if (habitation) {
      set({
        selectedHabitation: habitation,
        selectedSite: null,
        mapCenter: habitation.coordinates,
        zoom: 13,
      });
    } else {
      set({ selectedHabitation: null });
    }
  },

  setSelectedSite: (site) => {
    if (site) {
      set({
        selectedSite: site,
        selectedHabitation: null,
        mapCenter: site.coordinates,
        zoom: 13,
      });
    } else {
      set({ selectedSite: null });
    }
  },

  setMapCenter: (mapCenter, zoom) =>
    set((state) => ({
      mapCenter,
      zoom: zoom !== undefined ? zoom : state.zoom,
    })),

  setZoom: (zoom) => set({ zoom }),

  setSelectedDistrict: (selectedDistrict) => {
    set({ selectedDistrict });
    if (selectedDistrict === 'Wayanad') {
      set({ mapCenter: [11.55, 76.12], zoom: 11 });
    } else if (selectedDistrict === 'Joshimath' || selectedDistrict === 'Chamoli') {
      set({ mapCenter: [30.5564, 79.5638], zoom: 11 });
    } else if (selectedDistrict === 'Idukki') {
      set({ mapCenter: [9.8521, 77.0654], zoom: 11 });
    } else if (selectedDistrict === 'Rudraprayag') {
      set({ mapCenter: [30.5982, 79.0321], zoom: 11 });
    } else {
      set({ mapCenter: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  },

  resetView: () =>
    set({
      selectedHabitation: null,
      selectedSite: null,
      mapCenter: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    }),
}));
