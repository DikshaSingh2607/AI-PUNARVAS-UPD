export type PriorityLevel = 'IMMEDIATE' | 'HIGH' | 'PHASED' | 'SAFE';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type SiteStatus = 'VETTED' | 'REJECTED' | 'UNDER_REVIEW' | 'PROPOSED';

export type PlanStatus =
  | 'DRAFT'
  | 'GATE1_FAILED'
  | 'GATE2_FAILED'
  | 'APPROVED'
  | 'REJECTED'
  | 'MONITORING';

export type HazardType = 'flood' | 'landslide' | 'combined';

export interface Officer {
  id: string;
  name: string;
  email: string;
  role: 'STATE_COORDINATOR' | 'DISTRICT_COLLECTOR' | 'DISASTER_OFFICER' | 'GIS_ANALYST';
  district: string;
  badgeNumber: string;
  department: string;
}

export interface ShapValue {
  feature: string;
  displayName: string;
  value: number; // positive increases risk/negative decreases, or positive contributes to capacity
  category?: 'topography' | 'meteorological' | 'geotechnical' | 'infrastructure' | 'social';
}

export interface Habitation {
  id: string;
  name: string;
  district: string;
  state: string;
  coordinates: [number, number]; // [lat, lng]
  population: number;
  households: number;
  vulnerablePopulation: number; // elderly, children, disabled
  priority: PriorityLevel;
  floodScore: number; // 0-100
  landslideScore: number; // 0-100
  combinedScore: number; // 0-100
  confidence: ConfidenceLevel;
  slopeAngle: number; // in degrees
  elevation: number; // in meters
  rainfallAvg7d: number; // mm
  soilStability: 'STABLE' | 'MODERATE' | 'UNSTABLE' | 'HIGHLY_UNSTABLE';
  distanceToRiverMeters: number;
  lastAssessed: string;
  shapValues: ShapValue[];
  historicalIncidents: number;
}

export interface RelocationSite {
  id: string;
  name: string;
  district: string;
  state: string;
  coordinates: [number, number];
  capacityScore: number; // 0-100 overall suitability
  maxCapacityFamilies: number;
  currentAssignedFamilies: number;
  status: SiteStatus;
  areaHectares: number;
  waterAccessScore: number; // 0-100
  roadAccessDistanceKm: number;
  roadScore: number; // 0-100
  landStabilityScore: number; // 0-100
  livelihoodScore: number; // 0-100
  infrastructureScore: number; // 0-100
  hazardSafetyScore: number; // 0-100
  legalClearance: boolean;
  estimatedCostCrores: number;
  shapFactors: ShapValue[];
  amenities: string[];
}

export interface Gate1Evaluation {
  passed: boolean;
  score: number;
  threshold: number;
  primaryHazard: 'flood' | 'landslide' | 'multi-hazard';
  criticalTrigger: string;
  evaluatedAt: string;
  shapFactors: ShapValue[];
}

export interface Gate2Evaluation {
  passed: boolean;
  score: number;
  threshold: number;
  capacityScore: number;
  waterClearance: boolean;
  geotechClearance: boolean;
  evaluatedAt: string;
  shapFactors: ShapValue[];
  recommendedModifications?: string[];
}

export interface RelocationPlan {
  id: string;
  title: string;
  habitationId: string;
  habitationName: string;
  district: string;
  siteId?: string;
  siteName?: string;
  priority: PriorityLevel;
  status: PlanStatus;
  createdDate: string;
  updatedDate: string;
  officerId: string;
  officerName: string;
  targetFamilies: number;
  gate1: Gate1Evaluation;
  gate2?: Gate2Evaluation;
  notes: string;
  approvalTimestamp?: string;
  rejectionReason?: string;
}

export interface HazardEvent {
  id: string;
  title: string;
  type: 'flood' | 'landslide' | 'cloudburst' | 'subsidence';
  severity: 'EXTREME' | 'HIGH' | 'MODERATE';
  district: string;
  coordinates: [number, number];
  timestamp: string;
  affectedPopulation: number;
  description: string;
}

export interface RedZonePolygon {
  id: string;
  name: string;
  district: string;
  hazardType: HazardType;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  coordinates: [number, number][]; // Polygon rings
  areaSqKm: number;
  dominantThreat: string;
}

export interface DashboardStats {
  totalAtRiskPopulation: number;
  immediatePriorityCount: number;
  highPriorityCount: number;
  phasedCount: number;
  safeCount: number;
  sitesReadyCount: number;
  plansApprovedCount: number;
  avgRiskScore: number;
  trendAtRiskPct: number;
  trendImmediatePct: number;
  trendApprovedPct: number;
}

export interface DistrictSummary {
  district: string;
  habitationsCount: number;
  avgFloodScore: number;
  avgLandslideScore: number;
  avgCombinedScore: number;
  immediateCount: number;
  highCount: number;
  sitesCount: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'ALERT' | 'APPROVAL' | 'REJECTION' | 'SITE_ADDED' | 'RESCORE';
  title: string;
  description: string;
  user: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  officerId: string;
  officerName: string;
  district: string;
  action: 'PLAN_CREATED' | 'GATE1_EVALUATED' | 'GATE2_EVALUATED' | 'PLAN_APPROVED' | 'PLAN_REJECTED' | 'SITE_VETTED' | 'SITE_REJECTED' | 'RESCORED';
  targetType: 'HABITATION' | 'SITE' | 'PLAN';
  targetId: string;
  targetName: string;
  notes: string;
  gateDetails?: {
    gate1Score?: number;
    gate2Score?: number;
    passed?: boolean;
    criticalHazard?: string;
  };
  shapSnapshot?: ShapValue[];
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: any;
    };
    properties: Record<string, any>;
  }>;
}

// ========== Real Data & Advisory Types ==========
export interface CriticalAdvisory {
  habitation_id: number;
  habitation_name: string;
  district: string;
  lat: number;
  lon: number;
  advisory_type: 'CRITICAL' | 'HIGH' | 'WARNING' | 'NONE';
  multihazard_score: number;
  current_rainfall_7d_mm: number;
  triggers: string[];
  recommended_action: string;
  recommended_site: {
    site_id: number;
    site_name: string;
    distance_km: number;
    capacity: number;
  } | null;
  population_affected: number;
  households_estimate: number;
  shap_reasons: { feature: string; impact: number; direction: string }[];
  generated_at: string;
}

export interface BufferStatus {
  current_count: number;
  max_buffer: number;
  oldest_record_date: string;
  newest_record_date: string;
  by_district: Record<string, number>;
}

export interface WayanadDemoResult {
  status: string;
  habitations_created: number;
  sites_created: number;
  hazard_event: {
    name: string;
    type: string;
    severity: string;
    date: string;
  };
  relocation_plan: {
    from: string;
    to: string;
    status: string;
  };
  advisories: CriticalAdvisory[];
  message: string;
}

