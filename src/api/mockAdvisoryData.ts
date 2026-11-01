import { CriticalAdvisory, WayanadDemoResult } from '../types';

export const mockCriticalAdvisories: CriticalAdvisory[] = [
  {
    habitation_id: 1,
    habitation_name: 'Chooralmala Village',
    district: 'Wayanad',
    lat: 11.5367,
    lon: 76.1685,
    advisory_type: 'CRITICAL',
    multihazard_score: 0.92,
    current_rainfall_7d_mm: 285.4,
    triggers: [
      'Multi-hazard score 0.92 exceeds CRITICAL threshold (0.75)',
      'Current 7-day rainfall 285.4mm exceeds 150mm trigger',
      'Landslide score 0.89 with clay soil on 38° slope',
    ],
    recommended_action: 'IMMEDIATE EVACUATION to Kalpetta Safe Plateau (12.3km). Deploy NDRF teams.',
    recommended_site: {
      site_id: 101,
      site_name: 'Kalpetta Safe Plateau',
      distance_km: 12.3,
      capacity: 2000,
    },
    population_affected: 800,
    households_estimate: 180,
    shap_reasons: [
      { feature: 'slope_angle', impact: 0.28, direction: 'increases' },
      { feature: 'rainfall_intensity', impact: 0.24, direction: 'increases' },
      { feature: 'soil_moisture', impact: 0.18, direction: 'increases' },
    ],
    generated_at: new Date().toISOString(),
  },
  {
    habitation_id: 2,
    habitation_name: 'Mundakkai Settlement',
    district: 'Wayanad',
    lat: 11.5284,
    lon: 76.1821,
    advisory_type: 'CRITICAL',
    multihazard_score: 0.88,
    current_rainfall_7d_mm: 267.8,
    triggers: [
      'Multi-hazard score 0.88 exceeds CRITICAL threshold (0.75)',
      'Current 7-day rainfall 267.8mm exceeds 150mm trigger',
    ],
    recommended_action: 'IMMEDIATE EVACUATION to Sulthan Bathery Transit Zone (18.5km).',
    recommended_site: {
      site_id: 102,
      site_name: 'Sulthan Bathery Transit Zone',
      distance_km: 18.5,
      capacity: 1500,
    },
    population_affected: 450,
    households_estimate: 95,
    shap_reasons: [
      { feature: 'slope_angle', impact: 0.31, direction: 'increases' },
      { feature: 'rainfall_intensity', impact: 0.22, direction: 'increases' },
      { feature: 'vegetation_cover', impact: -0.15, direction: 'increases' },
    ],
    generated_at: new Date().toISOString(),
  },
];

export const mockWayanadDemo: WayanadDemoResult = {
  status: 'completed',
  habitations_created: 8,
  sites_created: 3,
  hazard_event: {
    name: 'Wayanad Chooralmala-Mundakkai Landslide 2024',
    type: 'LANDSLIDE',
    severity: 'CRITICAL',
    date: '2024-07-30',
  },
  relocation_plan: {
    from: 'Chooralmala Village',
    to: 'Kalpetta Safe Plateau',
    status: 'APPROVED',
  },
  advisories: [],
  message: 'Wayanad 2024 disaster demo scenario fully loaded with real elevation, rainfall, and ML-scored data.',
};
