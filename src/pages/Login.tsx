import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Shield,
  Lock,
  User,
  Activity,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('dr.sharma');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please provide officer username or badge number');
      return;
    }

    try {
      const success = await login(username, password);
      if (success) {
        toast.success(`Welcome back, Officer! Authenticated to Command Center.`);
        navigate('/');
      } else {
        setError('Invalid officer credentials or authorization token expired.');
      }
    } catch {
      setError('Authentication server unreachable. Please retry.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gray-950 text-gray-100 select-none">
      {/* Left Column: Mission Branding & Highlights */}
      <div className="lg:w-1/2 flex flex-col justify-between p-8 lg:p-14 bg-gradient-to-br from-gray-950 via-gray-900 to-red-950/30 border-r border-gray-800/80 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-glow text-white">
            <Shield size={28} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white">
              AI-PUNARVAS
            </h1>
            <p className="text-xs font-mono text-gray-400 tracking-widest uppercase">
              Disaster Relocation Intelligence Directorate
            </p>
          </div>
        </div>

        {/* Mission Statement & System Overview */}
        <div className="relative z-10 my-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-xs font-semibold">
            <Activity size={14} className="animate-pulse" />
            <span>Mission Autonomous Disaster Mitigation</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Scientific, Explainable, and Humane Community Relocation Planning
          </h2>

          <p className="text-sm text-gray-300 leading-relaxed">
            AI-PUNARVAS integrates differential satellite InSAR deformation, high-resolution LiDAR slope models, and meteorological precipitation data with a transparent Two-Gate statutory review framework to protect vulnerable populations before catastrophes occur.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-red-400 font-semibold text-xs mb-1">
                <Layers size={16} />
                <span>Two-Gate Statutory Approval</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Gate 1 Hazard Mandate + Gate 2 Safe Site Capacity Verification before relocation orders.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-xs mb-1">
                <Cpu size={16} />
                <span>TreeSHAP Explainable AI</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Transparent feature attributions explain every point of risk without black-box opacity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-xs mb-1">
                <CheckCircle2 size={16} />
                <span>Multi-Criteria Land Vetting</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Drinking water yields, slope stability, road connectivity, and livelihood continuity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-blue-400 font-semibold text-xs mb-1">
                <Activity size={16} />
                <span>Immutable Decision Audit Trail</span>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                Every administrative endorsement, override, and re-scoring logged with officer identity.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-gray-500 border-t border-gray-800 pt-4">
          <span>National Geohazard AI Platform</span>
          <span>v2.4.0 · Restricted Official Access</span>
        </div>
      </div>

      {/* Right Column: Officer Login Authentication Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-gray-950">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="inline-block px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-[11px] font-mono text-gray-400 mb-2">
              SECURE GOVERNMENT GATEWAY
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Authorized Officer Sign In
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Enter your credentials to access the disaster relocation operations terminal.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                Officer ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. dr.sharma or collector"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Security Passkey
                </label>
                <span className="text-[11px] text-gray-500 hover:text-gray-400 cursor-pointer">
                  NIC 2FA Token
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                />
              </div>
            </div>

            {/* Quick Demo Credentials Pill */}
            <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-800/80 text-xs text-gray-400">
              <span className="font-semibold text-gray-300 block mb-1">
                Demo Accounts (Click to test roles):
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('dr.sharma');
                    setPassword('admin123');
                  }}
                  className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-[11px] font-mono transition-colors"
                >
                  State Coordinator
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('collector');
                    setPassword('admin123');
                  }}
                  className="px-2.5 py-1 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 text-[11px] font-mono transition-colors"
                >
                  District Collector
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Enter Operations Command</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-[11px] text-gray-500">
            Protected by NIC GovCyber Threat Shield & SHA-256 Multi-Factor Clearance.
          </div>
        </div>
      </div>
    </div>
  );
};
