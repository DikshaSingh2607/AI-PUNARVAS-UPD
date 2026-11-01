import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileCheck2,
  Gauge,
  Activity,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Sparkles,
  Database,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { MainMap } from '../components/map/MainMap';
import { PriorityDistribution } from '../components/charts/PriorityDistribution';
import { DistrictRiskBar } from '../components/charts/DistrictRiskBar';
import { useMapData } from '../hooks/useMapData';
import { dashboardApi } from '../api/endpoints';
import { DashboardStats, ActivityItem, DistrictSummary } from '../types';
import { formatDate } from '../lib/utils';
import { useMapStore } from '../store/mapStore';
import { CriticalAlertBanner } from '../components/realdata/CriticalAlertBanner';
import { BufferStatusIndicator } from '../components/realdata/BufferStatusIndicator';
import { LiveDataPanel } from '../components/realdata/LiveDataPanel';
import { WayanadDemoShowcase } from '../components/realdata/WayanadDemoShowcase';

export const Dashboard: React.FC = () => {
  const { habitations, sites, redZones, isLoading: mapLoading, refetch: refetchMapData } = useMapData();
  const { setSelectedHabitation, setSelectedSite } = useMapStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [districtSummaries, setDistrictSummaries] = useState<DistrictSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWayanadModal, setShowWayanadModal] = useState<boolean>(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, actData, distData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecentActivity(),
        dashboardApi.getDistrictSummary(),
      ]);
      setStats(statsData);
      setActivities(actData);
      setDistrictSummaries(distData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleHabitationSelect = (hab: any) => {
    setSelectedHabitation(hab);
    navigate('/habitations');
  };

  const handleSiteSelect = (site: any) => {
    setSelectedSite(site);
    navigate('/sites');
  };

  // Activity icon mapper
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'ALERT':
        return <AlertTriangle size={14} className="text-red-400" />;
      case 'APPROVAL':
        return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'REJECTION':
        return <AlertTriangle size={14} className="text-amber-400" />;
      case 'SITE_ADDED':
        return <ShieldCheck size={14} className="text-cyan-400" />;
      case 'RESCORE':
      default:
        return <RotateCw size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Critical Evacuation Advisory Banner (Top of page) */}
      <CriticalAlertBanner />

      {/* Top Banner Notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border border-red-500/20 shadow-lg gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <div>
            <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider">
              Emergency Active Surveillance Mode
            </h4>
            <p className="text-xs text-gray-300">
              Western Ghats & Himalayan Sector InSAR satellite pass completed with 3 critical debris scarps flagged.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowWayanadModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={13} className="text-red-400" />
            <span>Wayanad 2024 Demo</span>
          </button>
          <button
            onClick={() => navigate('/relocate')}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-glow flex items-center gap-1.5 transition-colors"
          >
            <span>Open Relocation Flow</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. Stats Section Header with BufferStatusIndicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Critical Telemetry & Operational Metrics
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <BufferStatusIndicator />
        </div>
      </div>

      {/* Top Row: 6 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="At-Risk Population"
          value={stats?.totalAtRiskPopulation || 14600}
          unit="citizens"
          icon={<Users size={18} />}
          trend={stats?.trendAtRiskPct || -4.2}
          trendLabel="vs last month"
          accent="red"
        />

        <StatCard
          label="Immediate Evac"
          value={stats?.immediatePriorityCount || 3}
          unit="habitations"
          icon={<AlertTriangle size={18} />}
          trend={stats?.trendImmediatePct || -12.5}
          trendLabel="post-monsoon"
          accent="red"
        />

        <StatCard
          label="High Priority"
          value={stats?.highPriorityCount || 3}
          unit="settlements"
          icon={<Flame size={18} />}
          subtext="Under Phase 2 watch"
          accent="amber"
        />

        <StatCard
          label="Sites Vetted"
          value={stats?.sitesReadyCount || 3}
          unit="parcels"
          icon={<CheckCircle2 size={18} />}
          subtext="Gate 2 cleared"
          accent="green"
        />

        <StatCard
          label="Plans Approved"
          value={stats?.plansApprovedCount || 4}
          unit="orders"
          icon={<FileCheck2 size={18} />}
          trend={stats?.trendApprovedPct || 33.3}
          trendLabel="statutory"
          accent="blue"
        />

        <StatCard
          label="Avg Hazard Index"
          value={stats ? `${stats.avgRiskScore}%` : '68.4%'}
          icon={<Gauge size={18} />}
          subtext="Multi-hazard composite"
          accent="purple"
        />
      </div>

      {/* Middle: Full-width Leaflet Interactive Map (60vh) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Geospatial Operations & Vulnerability Heatmap
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              (Live Dark GIS Canvas)
            </span>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {habitations.length} Habitations · {sites.length} Resettlement Parcels · {redZones.length} Red Zones
          </span>
        </div>

        <MainMap
          habitations={habitations}
          sites={sites}
          redZones={redZones}
          height="60vh"
          onHabitationSelect={handleHabitationSelect}
          onSiteSelect={handleSiteSelect}
        />
      </div>

      {/* 3. Real Data Operations Section (Below Map) */}
      <div className="space-y-2">
        <LiveDataPanel
          onOpenWayanadDemo={() => setShowWayanadModal(true)}
          onDataIngested={() => {
            refetchMapData();
            loadDashboardData();
          }}
        />
      </div>

      {/* Bottom Row: Priority Donut + District Bar + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut: Priority Distribution */}
        <PriorityDistribution
          immediateCount={stats?.immediatePriorityCount || 3}
          highCount={stats?.highPriorityCount || 3}
          phasedCount={stats?.phasedCount || 2}
          safeCount={stats?.safeCount || 2}
        />

        {/* Bar: District Risk Comparison */}
        <DistrictRiskBar data={districtSummaries} />

        {/* Live Activity Feed */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity size={16} className="text-red-400" />
                <span>Recent Relocation Actions</span>
              </h4>
              <button
                onClick={() => navigate('/audit')}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Audit Logs</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-3">
              {activities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-950/40 border border-gray-800/80 hover:border-gray-700 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-gray-900 border border-gray-800 shrink-0 mt-0.5">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
                        {formatDate(act.timestamp).split(',')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">
                      {act.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Verified Officer Operations</span>
            <span className="text-emerald-400 font-mono">256-bit Encrypted</span>
          </div>
        </div>
      </div>

      {/* 4. Wayanad 2024 Showcase Modal Dialog */}
      {showWayanadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl my-8">
            <WayanadDemoShowcase
              onClose={() => setShowWayanadModal(false)}
              onPlanRelocation={() => {
                setShowWayanadModal(false);
                navigate('/relocate');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
