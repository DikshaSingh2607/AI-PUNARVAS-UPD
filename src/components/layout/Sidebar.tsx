import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Flame,
  Home,
  MapPin,
  GitPullRequest,
  History,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      badge: null,
    },
    {
      to: '/red-zones',
      label: 'Red Zones',
      icon: <Flame size={20} />,
      badge: 'Live',
    },
    {
      to: '/habitations',
      label: 'Habitations',
      icon: <Home size={20} />,
      badge: null,
    },
    {
      to: '/sites',
      label: 'Site Assessment',
      icon: <MapPin size={20} />,
      badge: null,
    },
    {
      to: '/relocate',
      label: 'Relocate Plans',
      icon: <GitPullRequest size={20} />,
      badge: '2-Gate',
    },
    {
      to: '/audit',
      label: 'Audit Trail',
      icon: <History size={20} />,
      badge: null,
    },
  ];

  // Officer initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'OF';

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-gray-950 border-r border-gray-800/80 transition-all duration-300 z-30 select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-glow text-white">
            <Shield size={22} className="stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-wider text-white">
                AI-PUNARVAS
              </span>
              <span className="text-[10px] uppercase font-mono text-gray-400 tracking-widest truncate">
                Disaster Relocation
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors',
            collapsed && 'hidden'
          )}
          title="Toggle Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {collapsed && (
        <div className="flex justify-center py-2 border-b border-gray-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Real-time Sentinel Status */}
      {!collapsed && (
        <div className="mx-3 my-3 p-2.5 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-gray-300 font-medium">InSAR Sentinel Feed</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase">Synced</span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
                isActive
                  ? 'bg-red-600/15 text-red-400 border border-red-500/30 shadow-glow font-semibold'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900/80'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-red-400' : 'text-gray-400 group-hover:text-gray-200'
                  )}
                >
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/90 text-red-300 border border-red-500/40">
                    {item.badge}
                  </span>
                )}

                {/* Subtle active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-500 rounded-r-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Officer Profile & Session */}
      <div className="p-3 border-t border-gray-800/80 bg-gray-950/60">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl bg-gray-900/70 border border-gray-800',
            collapsed ? 'justify-center p-2' : ''
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-950 text-red-400 font-bold border border-red-500/40 text-xs">
            {initials}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-semibold text-white truncate">
                {user?.name || 'Authorized Officer'}
              </h5>
              <p className="text-[10px] text-gray-400 font-mono truncate">
                {user?.role?.replace('_', ' ') || 'State Collector'}
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors ml-auto"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
