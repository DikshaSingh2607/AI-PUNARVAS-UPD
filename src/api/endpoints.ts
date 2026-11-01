import { apiClient } from './client';
import {
  Officer,
  Habitation,
  RelocationSite,
  RelocationPlan,
  HazardEvent,
  RedZonePolygon,
  DashboardStats,
  DistrictSummary,
  ActivityItem,
  AuditLogEntry,
  PriorityLevel,
  SiteStatus,
  HazardType,
  GeoJsonFeatureCollection,
} from '../types';
import {
  mockCurrentUser,
  mockHabitations,
  mockSites,
  mockRelocationPlans,
  mockHazardEvents,
  mockRedZonePolygons,
  mockDashboardStats,
  mockDistrictSummaries,
  mockRecentActivities,
  mockAuditLogs,
} from './mockData';

// Mutable in-memory copies for local fallback mutations
let localHabitations: Habitation[] = [...mockHabitations];
let localSites: RelocationSite[] = [...mockSites];
let localPlans: RelocationPlan[] = [...mockRelocationPlans];
let localAuditLogs: AuditLogEntry[] = [...mockAuditLogs];

// ================= AUTH ENDPOINTS =================
export const authApi = {
  login: async (credentials: { username: string; password?: string }): Promise<{ token: string; user: Officer }> => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch {
      // Fallback: successful mock login for officer credentials
      const token = 'mock-jwt-token-eyAiYWxnIjoiSFMyNTYiLCJ0eXAiOiJKV1QiLCJhbW8iOiJPZmZpY2VyIn0';
      const user: Officer = {
        ...mockCurrentUser,
        name: credentials.username === 'collector' ? 'District Collector Wayanad' : mockCurrentUser.name,
        role: credentials.username === 'collector' ? 'DISTRICT_COLLECTOR' : mockCurrentUser.role,
        district: credentials.username === 'collector' ? 'Wayanad' : mockCurrentUser.district,
      };
      return { token, user };
    }
  },

  getMe: async (): Promise<Officer> => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch {
      return mockCurrentUser;
    }
  },
};

// ================= HABITATIONS ENDPOINTS =================
export interface HabitationFilters {
  district?: string;
  priority?: PriorityLevel;
  search?: string;
  minScore?: number;
}

export const habitationsApi = {
  getAll: async (filters?: HabitationFilters): Promise<Habitation[]> => {
    try {
      const response = await apiClient.get('/habitations', { params: filters });
      return response.data;
    } catch {
      let result = [...localHabitations];
      if (filters?.district && filters.district !== 'All Districts') {
        result = result.filter((h) => h.district.toLowerCase() === filters.district?.toLowerCase());
      }
      if (filters?.priority) {
        result = result.filter((h) => h.priority === filters.priority);
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        result = result.filter(
          (h) => h.name.toLowerCase().includes(query) || h.district.toLowerCase().includes(query)
        );
      }
      if (filters?.minScore !== undefined) {
        result = result.filter((h) => h.combinedScore >= (filters.minScore || 0));
      }
      return result;
    }
  },

  getById: async (id: string): Promise<Habitation | undefined> => {
    try {
      const response = await apiClient.get(`/habitations/${id}`);
      return response.data;
    } catch {
      return localHabitations.find((h) => h.id === id);
    }
  },

  getGeoJSON: async (): Promise<GeoJsonFeatureCollection> => {
    try {
      const response = await apiClient.get('/habitations/geojson');
      return response.data;
    } catch {
      return {
        type: 'FeatureCollection',
        features: localHabitations.map((h) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [h.coordinates[1], h.coordinates[0]], // GeoJSON is [lng, lat]
          },
          properties: { ...h },
        })),
      };
    }
  },

  getStats: async (): Promise<{ total: number; immediate: number; high: number; phased: number; safe: number }> => {
    try {
      const response = await apiClient.get('/habitations/stats');
      return response.data;
    } catch {
      return {
        total: localHabitations.length,
        immediate: localHabitations.filter((h) => h.priority === 'IMMEDIATE').length,
        high: localHabitations.filter((h) => h.priority === 'HIGH').length,
        phased: localHabitations.filter((h) => h.priority === 'PHASED').length,
        safe: localHabitations.filter((h) => h.priority === 'SAFE').length,
      };
    }
  },

  rescore: async (id: string): Promise<Habitation> => {
    try {
      const response = await apiClient.post(`/habitations/${id}/rescore`);
      return response.data;
    } catch {
      const index = localHabitations.findIndex((h) => h.id === id);
      if (index !== -1) {
        // Minor dynamic variation simulating real-time recalculation
        const item = { ...localHabitations[index] };
        item.lastAssessed = new Date().toISOString();
        localHabitations[index] = item;
        return item;
      }
      throw new Error('Habitation not found');
    }
  },
};

// ================= SITES ENDPOINTS =================
export interface SiteFilters {
  district?: string;
  minCapacity?: number;
  status?: SiteStatus;
  search?: string;
}

export const sitesApi = {
  getAll: async (filters?: SiteFilters): Promise<RelocationSite[]> => {
    try {
      const response = await apiClient.get('/sites', { params: filters });
      return response.data;
    } catch {
      let result = [...localSites];
      if (filters?.district && filters.district !== 'All Districts') {
        result = result.filter((s) => s.district.toLowerCase() === filters.district?.toLowerCase());
      }
      if (filters?.status) {
        result = result.filter((s) => s.status === filters.status);
      }
      if (filters?.minCapacity) {
        result = result.filter((s) => s.capacityScore >= (filters.minCapacity || 0));
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        result = result.filter(
          (s) => s.name.toLowerCase().includes(query) || s.district.toLowerCase().includes(query)
        );
      }
      return result;
    }
  },

  getById: async (id: string): Promise<RelocationSite | undefined> => {
    try {
      const response = await apiClient.get(`/sites/${id}`);
      return response.data;
    } catch {
      return localSites.find((s) => s.id === id);
    }
  },

  getGeoJSON: async (): Promise<GeoJsonFeatureCollection> => {
    try {
      const response = await apiClient.get('/sites/geojson');
      return response.data;
    } catch {
      return {
        type: 'FeatureCollection',
        features: localSites.map((s) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [s.coordinates[1], s.coordinates[0]],
          },
          properties: { ...s },
        })),
      };
    }
  },

  compareSites: async (siteAId: string, siteBId: string): Promise<{ siteA: RelocationSite; siteB: RelocationSite }> => {
    try {
      const response = await apiClient.get('/sites/compare', { params: { siteA: siteAId, siteB: siteBId } });
      return response.data;
    } catch {
      const siteA = localSites.find((s) => s.id === siteAId) || localSites[0];
      const siteB = localSites.find((s) => s.id === siteBId) || localSites[1];
      return { siteA, siteB };
    }
  },

  updateStatus: async (id: string, status: SiteStatus, notes?: string): Promise<RelocationSite> => {
    try {
      const response = await apiClient.patch(`/sites/${id}/status`, { status, notes });
      return response.data;
    } catch {
      const index = localSites.findIndex((s) => s.id === id);
      if (index !== -1) {
        localSites[index] = { ...localSites[index], status };
        // Log action in audit trail
        localAuditLogs.unshift({
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          officerId: mockCurrentUser.id,
          officerName: mockCurrentUser.name,
          district: localSites[index].district,
          action: status === 'VETTED' ? 'SITE_VETTED' : 'SITE_REJECTED',
          targetType: 'SITE',
          targetId: id,
          targetName: localSites[index].name,
          notes: notes || `Site status changed to ${status}`,
          gateDetails: {
            gate2Score: localSites[index].capacityScore,
            passed: status === 'VETTED',
          },
        });
        return localSites[index];
      }
      throw new Error('Site not found');
    }
  },
};

// ================= HAZARDS ENDPOINTS =================
export const hazardsApi = {
  getRedZoneMap: async (): Promise<RedZonePolygon[]> => {
    try {
      const response = await apiClient.get('/hazards/red-zones');
      return response.data;
    } catch {
      return mockRedZonePolygons;
    }
  },

  getEvents: async (): Promise<HazardEvent[]> => {
    try {
      const response = await apiClient.get('/hazards/events');
      return response.data;
    } catch {
      return mockHazardEvents;
    }
  },

  getRiskSummary: async (): Promise<DistrictSummary[]> => {
    try {
      const response = await apiClient.get('/hazards/risk-summary');
      return response.data;
    } catch {
      return mockDistrictSummaries;
    }
  },

  getLayer: async (type: HazardType): Promise<RedZonePolygon[]> => {
    try {
      const response = await apiClient.get(`/hazards/layers/${type}`);
      return response.data;
    } catch {
      if (type === 'combined') {
        return mockRedZonePolygons;
      }
      return mockRedZonePolygons.filter((rz) => rz.hazardType === type || rz.hazardType === 'combined');
    }
  },
};

// ================= RELOCATIONS & 2-GATE FLOW ENDPOINTS =================
export interface RelocationPlanFilters {
  district?: string;
  status?: string;
  search?: string;
}

export const relocationsApi = {
  getAll: async (filters?: RelocationPlanFilters): Promise<RelocationPlan[]> => {
    try {
      const response = await apiClient.get('/relocations', { params: filters });
      return response.data;
    } catch {
      let result = [...localPlans];
      if (filters?.district && filters.district !== 'All Districts') {
        result = result.filter((p) => p.district.toLowerCase() === filters.district?.toLowerCase());
      }
      if (filters?.status && filters.status !== 'ALL') {
        result = result.filter((p) => p.status === filters.status);
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.habitationName.toLowerCase().includes(query) ||
            (p.siteName && p.siteName.toLowerCase().includes(query))
        );
      }
      return result;
    }
  },

  getById: async (id: string): Promise<RelocationPlan | undefined> => {
    try {
      const response = await apiClient.get(`/relocations/${id}`);
      return response.data;
    } catch {
      return localPlans.find((p) => p.id === id);
    }
  },

  create: async (data: Partial<RelocationPlan>): Promise<RelocationPlan> => {
    try {
      const response = await apiClient.post('/relocations', data);
      return response.data;
    } catch {
      const hab = localHabitations.find((h) => h.id === data.habitationId) || localHabitations[0];
      const site = localSites.find((s) => s.id === data.siteId) || localSites[0];
      const newPlan: RelocationPlan = {
        id: `PLAN-${Math.floor(1000 + Math.random() * 9000)}`,
        title: data.title || `Relocation Plan: ${hab.name}`,
        habitationId: hab.id,
        habitationName: hab.name,
        district: hab.district,
        siteId: site?.id,
        siteName: site?.name,
        priority: hab.priority,
        status: 'DRAFT',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        officerId: mockCurrentUser.id,
        officerName: mockCurrentUser.name,
        targetFamilies: hab.households,
        gate1: {
          passed: hab.combinedScore >= 60,
          score: hab.combinedScore,
          threshold: 60,
          primaryHazard: hab.landslideScore >= hab.floodScore ? 'landslide' : 'flood',
          criticalTrigger: `Risk score (${hab.combinedScore}%) exceeds statutory threshold.`,
          evaluatedAt: new Date().toISOString(),
          shapFactors: hab.shapValues.slice(0, 3),
        },
        gate2: site
          ? {
              passed: site.capacityScore >= 70,
              score: site.capacityScore,
              threshold: 70,
              capacityScore: site.capacityScore,
              waterClearance: site.waterAccessScore >= 70,
              geotechClearance: site.landStabilityScore >= 70,
              evaluatedAt: new Date().toISOString(),
              shapFactors: site.shapFactors.slice(0, 3),
            }
          : undefined,
        notes: data.notes || 'Initiated by relocation planning office.',
      };

      localPlans.unshift(newPlan);
      localAuditLogs.unshift({
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        officerId: mockCurrentUser.id,
        officerName: mockCurrentUser.name,
        district: newPlan.district,
        action: 'PLAN_CREATED',
        targetType: 'PLAN',
        targetId: newPlan.id,
        targetName: newPlan.title,
        notes: `New plan created for ${hab.name}`,
        gateDetails: {
          gate1Score: newPlan.gate1.score,
          passed: newPlan.gate1.passed,
        },
      });

      return newPlan;
    }
  },

  gate2Check: async (
    planId: string,
    siteId: string
  ): Promise<{ passed: boolean; score: number; gate2: RelocationPlan['gate2'] }> => {
    try {
      const response = await apiClient.post(`/relocations/${planId}/gate2-check`, { siteId });
      return response.data;
    } catch {
      const site = localSites.find((s) => s.id === siteId) || localSites[0];
      const passed = site.capacityScore >= 70 && site.waterAccessScore >= 65 && site.landStabilityScore >= 70;
      const gate2Obj = {
        passed,
        score: site.capacityScore,
        threshold: 70,
        capacityScore: site.capacityScore,
        waterClearance: site.waterAccessScore >= 65,
        geotechClearance: site.landStabilityScore >= 70,
        evaluatedAt: new Date().toISOString(),
        shapFactors: site.shapFactors.slice(0, 3),
        recommendedModifications: passed
          ? ['Maintain engineered swale drainage', 'Verify electricity feeder connection']
          : ['Identify auxiliary drinking water source', 'Re-evaluate slope grading'],
      };

      const planIndex = localPlans.findIndex((p) => p.id === planId);
      if (planIndex !== -1) {
        localPlans[planIndex].siteId = site.id;
        localPlans[planIndex].siteName = site.name;
        localPlans[planIndex].gate2 = gate2Obj;
        localPlans[planIndex].status = passed ? 'DRAFT' : 'GATE2_FAILED';
      }

      return { passed, score: site.capacityScore, gate2: gate2Obj };
    }
  },

  approve: async (id: string, notes: string): Promise<RelocationPlan> => {
    try {
      const response = await apiClient.post(`/relocations/${id}/approve`, { notes });
      return response.data;
    } catch {
      const index = localPlans.findIndex((p) => p.id === id);
      if (index !== -1) {
        const updated = {
          ...localPlans[index],
          status: 'APPROVED' as const,
          notes: notes ? `${localPlans[index].notes} | Approval Notes: ${notes}` : localPlans[index].notes,
          approvalTimestamp: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        };
        localPlans[index] = updated;

        localAuditLogs.unshift({
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          officerId: mockCurrentUser.id,
          officerName: mockCurrentUser.name,
          district: updated.district,
          action: 'PLAN_APPROVED',
          targetType: 'PLAN',
          targetId: id,
          targetName: updated.title,
          notes: notes || 'Plan approved by authority.',
          gateDetails: {
            gate1Score: updated.gate1.score,
            gate2Score: updated.gate2?.score,
            passed: true,
          },
        });

        return updated;
      }
      throw new Error('Plan not found');
    }
  },

  reject: async (id: string, notes: string): Promise<RelocationPlan> => {
    try {
      const response = await apiClient.post(`/relocations/${id}/reject`, { notes });
      return response.data;
    } catch {
      const index = localPlans.findIndex((p) => p.id === id);
      if (index !== -1) {
        const updated = {
          ...localPlans[index],
          status: 'REJECTED' as const,
          rejectionReason: notes,
          notes: notes ? `${localPlans[index].notes} | Rejection Reason: ${notes}` : localPlans[index].notes,
          updatedDate: new Date().toISOString(),
        };
        localPlans[index] = updated;

        localAuditLogs.unshift({
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          officerId: mockCurrentUser.id,
          officerName: mockCurrentUser.name,
          district: updated.district,
          action: 'PLAN_REJECTED',
          targetType: 'PLAN',
          targetId: id,
          targetName: updated.title,
          notes: notes || 'Plan rejected by authority.',
          gateDetails: {
            gate1Score: updated.gate1.score,
            gate2Score: updated.gate2?.score,
            passed: false,
          },
        });

        return updated;
      }
      throw new Error('Plan not found');
    }
  },

  getAuditLog: async (filters?: { district?: string; status?: string; search?: string }): Promise<AuditLogEntry[]> => {
    try {
      const response = await apiClient.get('/relocations/audit-logs', { params: filters });
      return response.data;
    } catch {
      let result = [...localAuditLogs];
      if (filters?.district && filters.district !== 'All Districts') {
        result = result.filter((a) => a.district.toLowerCase() === filters.district?.toLowerCase());
      }
      if (filters?.status && filters.status !== 'ALL') {
        result = result.filter((a) => a.action.includes(filters.status || ''));
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        result = result.filter(
          (a) =>
            a.targetName.toLowerCase().includes(query) ||
            a.officerName.toLowerCase().includes(query) ||
            a.notes.toLowerCase().includes(query)
        );
      }
      return result;
    }
  },
};

// ================= DASHBOARD ENDPOINTS =================
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    } catch {
      return mockDashboardStats;
    }
  },

  getRecentActivity: async (): Promise<ActivityItem[]> => {
    try {
      const response = await apiClient.get('/dashboard/recent-activity');
      return response.data;
    } catch {
      return mockRecentActivities;
    }
  },

  getDistrictSummary: async (): Promise<DistrictSummary[]> => {
    try {
      const response = await apiClient.get('/dashboard/districts');
      return response.data;
    } catch {
      return mockDistrictSummaries;
    }
  },
};

import { CriticalAdvisory, BufferStatus, WayanadDemoResult } from '../types';
import { mockCriticalAdvisories, mockWayanadDemo } from './mockAdvisoryData';

// ================= REAL DATA & LIVE PIPELINE ENDPOINTS =================
export const realdataApi = {
  // Ingest real villages from a district using open APIs
  ingestDistrict: async (district: string, limit: number = 40): Promise<{
    ingested_count: number;
    total_records: number;
    buffer_status: { current: number; max: number; utilization_pct: number };
    habitations: any[];
  }> => {
    try {
      const response = await apiClient.post('/realdata/ingest-district', null, {
        params: { district, limit },
      });
      return response.data;
    } catch {
      // Mock fallback
      return {
        ingested_count: 0,
        total_records: localHabitations.length,
        buffer_status: { current: localHabitations.length, max: 200, utilization_pct: (localHabitations.length / 200) * 100 },
        habitations: [],
      };
    }
  },

  // Get critical evacuation advisories
  getCriticalAdvisories: async (): Promise<CriticalAdvisory[]> => {
    try {
      const response = await apiClient.get('/realdata/critical-advisories');
      return response.data;
    } catch {
      return mockCriticalAdvisories;
    }
  },

  // Get rolling buffer status
  getBufferStatus: async (): Promise<BufferStatus> => {
    try {
      const response = await apiClient.get('/realdata/buffer-status');
      return response.data;
    } catch {
      return {
        current_count: localHabitations.length,
        max_buffer: 200,
        oldest_record_date: '2024-01-15',
        newest_record_date: new Date().toISOString(),
        by_district: { Wayanad: 12, Chamoli: 8, Idukki: 6 },
      };
    }
  },

  // Trigger Wayanad demo
  runWayanadDemo: async (): Promise<WayanadDemoResult> => {
    try {
      const response = await apiClient.post('/realdata/wayanad-demo');
      return response.data;
    } catch {
      return mockWayanadDemo;
    }
  },

  // Enforce FIFO buffer
  enforceBuffer: async (): Promise<{ deleted_count: number; remaining_count: number }> => {
    try {
      const response = await apiClient.post('/realdata/enforce-buffer');
      return response.data;
    } catch {
      return { deleted_count: 0, remaining_count: localHabitations.length };
    }
  },

  // Live risk snapshot for any coordinate
  getLiveRiskSnapshot: async (lat: number, lon: number): Promise<any> => {
    try {
      const response = await apiClient.get('/realdata/live-risk-snapshot', { params: { lat, lon } });
      return response.data;
    } catch {
      return { coordinates: { lat, lon }, elevation_m: null, rainfall: {}, soil_moisture_index: null, recent_earthquakes_150km: [] };
    }
  },
};
