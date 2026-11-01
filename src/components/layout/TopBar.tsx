import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bell,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useMapStore } from '../../store/mapStore';
import { cn } from '../../lib/utils';

export const TopBar: React.FC = () => {
  const location = useLocation();
  const { selectedDistrict, setSelectedDistrict } = useMapStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const districts = [
    'All Districts',
    'Wayanad',
    'Joshimath',
    'Idukki',
    'Chamoli',
    'Rudraprayag',
  ];

  // Derive title from pathname
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return {
          title: 'Disaster Command & Relocation Overview',
          subtitle: 'Real-time multi-hazard vulnerability & site suitability monitoring',
        };
      case '/red-zones':
        return {
          title: 'Geohazard Red Zones Explorer',
          subtitle: 'Debris flow, landslide shear, and flash-flood corridor delineation',
        };
      case '/habitations':
        return {
          title: 'Habitation Risk Management',
          subtitle: 'Granular settlement vulnerability, slope kinematics, and SHAP explainability',
        };
      case '/sites':
        return {
          title: 'Relocation Parcel Assessment',
          subtitle: 'Safe capacity vetting, water accessibility, and infrastructure readiness',
        };
      case '/relocate':
        return {
          title: 'Two-Gate Relocation Planning & Approval',
          subtitle: 'Statutory verification pipeline: Gate 1 Hazard Trigger → Gate 2 Capacity Clearance',
        };
      case '/audit':
        return {
          title: 'Executive Decision Audit Trail',
          subtitle: 'Tamper-evident logs of administrative actions and algorithmic scores',
        };
      default:
        return {
          title: 'AI-PUNARVAS Intelligence System',
          subtitle: 'Government of India Geohazard Relocation Directorate',
        };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  const notifications = [
    {
      id: 1,
      title: 'Chooralmala Debris Scarp Shift',
      desc: 'Crack width expanded 8mm in 12h. Gate 1 threshold confirmed.',
      time: '12m ago',
      type: 'danger',
    },
    {
      id: 2,
      title: 'Nedumpala Estate Water Clearance',
      desc: 'Gravity pipeline certified by Jal Jeevan Mission engineers.',
      time: '1h ago',
      type: 'success',
    },
    {
      id: 3,
      title: 'Sentinel-1 InSAR Ingestion',
      desc: 'Differential interferogram uploaded for Joshimath subsidence.',
      time: '3h ago',
      type: 'info',
    },
  ];

  return (
    <header className="h-16 bg-gray-950/90 border-b border-gray-800/80 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col min-w-0 pr-4">
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
          <span>{title}</span>
        </h1>
        <p className="text-[11px] text-gray-400 truncate hidden sm:block">
          {subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* District Selector */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 shadow-inner">
          <MapPin size={14} className="text-red-400 shrink-0" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-1"
          >
            {districts.map((d) => (
              <option key={d} value={d} className="bg-gray-900 text-white">
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Live System Time */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-gray-400 bg-gray-900/60 px-3 py-1.5 rounded-xl border border-gray-800">
          <Clock size={13} className="text-emerald-400" />
          <span>Synced: 17 Oct 2026, 16:45 IST</span>
        </div>

        {/* Live Satellite Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-400 font-mono">
          <Radio size={12} className="animate-pulse" />
          <span>REALTIME DATA</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-glow">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Hazard Alerts
                </span>
                <span className="text-[10px] font-mono text-gray-400">3 unread</span>
              </div>
              <div className="mt-2 space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        {n.type === 'danger' && <AlertTriangle size={12} className="text-red-400" />}
                        {n.type === 'success' && <CheckCircle2 size={12} className="text-emerald-400" />}
                        {n.type === 'info' && <Radio size={12} className="text-blue-400" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 leading-normal">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
