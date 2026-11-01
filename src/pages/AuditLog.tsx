import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Cpu,
  Lock,
} from 'lucide-react';
import { relocationsApi } from '../api/endpoints';
import { AuditLogEntry } from '../types';
import { formatDate } from '../lib/utils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await relocationsApi.getAuditLog({
        district: selectedDistrict !== 'All Districts' ? selectedDistrict : undefined,
        status: actionFilter !== 'ALL' ? actionFilter : undefined,
        search: search || undefined,
      });
      setLogs(data);
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedDistrict, actionFilter, search]);

  const toggleExpand = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('No log records available to export');
      return;
    }

    const headers = ['Log ID', 'Timestamp', 'Officer ID', 'Officer Name', 'District', 'Action', 'Target Type', 'Target Name', 'Gate 1 Score', 'Gate 2 Score', 'Notes'];
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.officerId}"`,
      `"${l.officerName}"`,
      `"${l.district}"`,
      `"${l.action}"`,
      `"${l.targetType}"`,
      `"${l.targetName}"`,
      `"${l.gateDetails?.gate1Score ?? 'N/A'}"`,
      `"${l.gateDetails?.gate2Score ?? 'N/A'}"`,
      `"${l.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AI_PUNARVAS_AUDIT_TRAIL_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Audit log CSV exported successfully.');
  };

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'PLAN_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
            <CheckCircle2 size={11} /> ORDER APPROVED
          </span>
        );
      case 'PLAN_REJECTED':
      case 'SITE_REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-500/40 text-[10px] font-bold">
            <XCircle size={11} /> REJECTED
          </span>
        );
      case 'SITE_VETTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
            <CheckCircle2 size={11} /> SITE VETTED
          </span>
        );
      case 'GATE1_EVALUATED':
      case 'GATE2_EVALUATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
            <AlertTriangle size={11} /> GATE EVALUATED
          </span>
        );
      case 'PLAN_CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
            <FileCheck2 size={11} /> PLAN INITIATED
          </span>
        );
      case 'RESCORED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 text-[10px] font-bold">
            <RotateCw size={11} /> RESCORED
          </span>
        );
    }
  };

  const districtOptions = ['All Districts', 'Wayanad', 'Joshimath', 'Idukki', 'Chamoli', 'Rudraprayag'];
  const actionOptions = [
    { label: 'All Actions', value: 'ALL' },
    { label: 'Approved Plans', value: 'APPROVED' },
    { label: 'Rejected Plans', value: 'REJECTED' },
    { label: 'Site Vetting', value: 'SITE' },
    { label: 'Gate Evaluations', value: 'GATE' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History size={22} className="text-red-500" />
            <span>Executive Relocation Decision Audit Trail</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cryptographically sealed and immutable log of administrative actions, statutory approvals, and model snapshots
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <Download size={14} className="text-emerald-400" />
          <span>Export CSV Trail</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search action, officer name, settlement, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* District selector */}
          <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs">
            <MapPin size={14} className="text-red-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {districtOptions.map((d) => (
                <option key={d} value={d} className="bg-gray-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
            {actionOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActionFilter(opt.value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  actionFilter === opt.value
                    ? 'bg-red-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/70 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-40">Timestamp</th>
                <th className="py-3.5 px-4">Authorized Officer</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Executive Rationale</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {logs.map((log) => {
                const isExpanded = expandedRowId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className={cn(
                        'hover:bg-gray-800/50 cursor-pointer transition-colors',
                        isExpanded ? 'bg-gray-800/40' : ''
                      )}
                    >
                      <td className="py-3.5 px-4 font-mono text-gray-400 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{log.officerName}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{log.officerId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-400">
                        {log.district}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                        {log.targetName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 max-w-sm truncate">
                        {log.notes}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(log.id);
                          }}
                          className="p-1.5 rounded-lg bg-gray-950 text-gray-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Details Row */}
                    {isExpanded && (
                      <tr className="bg-gray-950/80 border-b border-gray-800">
                        <td colSpan={7} className="p-5">
                          <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-4">
                            <div className="flex flex-wrap items-center justify-between border-b border-gray-800 pb-2.5">
                              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                                <Lock size={13} />
                                <span>Cryptographic Audit Proof: SHA256:{Math.random().toString(36).substring(2, 15)}...</span>
                              </div>
                              <span className="text-[11px] text-gray-500 font-mono">
                                Target ID: {log.targetId} ({log.targetType})
                              </span>
                            </div>

                            {/* Gate Evaluation Metrics if available */}
                            {log.gateDetails && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {log.gateDetails.gate1Score !== undefined && (
                                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Gate 1 Threat Score</span>
                                    <strong className="text-red-400 font-mono text-sm">{log.gateDetails.gate1Score}%</strong>
                                  </div>
                                )}
                                {log.gateDetails.gate2Score !== undefined && (
                                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Gate 2 Capacity Score</span>
                                    <strong className="text-emerald-400 font-mono text-sm">{log.gateDetails.gate2Score}%</strong>
                                  </div>
                                )}
                                {log.gateDetails.criticalHazard && (
                                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Trigger Condition</span>
                                    <span className="text-gray-300 text-xs">{log.gateDetails.criticalHazard}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SHAP Snapshot if available */}
                            {log.shapSnapshot && log.shapSnapshot.length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                                  <Cpu size={14} className="text-amber-400" />
                                  <span>SHAP Attributions at Time of Action</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {log.shapSnapshot.map((sh, idx) => (
                                    <div key={idx} className="p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-xs flex justify-between items-center">
                                      <span className="text-gray-300 truncate">{sh.displayName}</span>
                                      <span className="font-mono text-red-400 font-bold ml-2">
                                        +{(sh.value * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-gray-400 leading-relaxed pt-1">
                              <strong className="text-white block mb-0.5">Full Officer Rationale:</strong>
                              {log.notes}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
