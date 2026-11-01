import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Plus,
  FileCheck2,
  MapPin,
  Users,
  ChevronRight,
  Flame,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { relocationsApi, sitesApi, habitationsApi } from '../api/endpoints';
import { RelocationPlan, RelocationSite, Habitation, PlanStatus } from '../types';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { ScoreBar } from '../components/ui/ScoreBar';
import { cn, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export const RelocatePlan: React.FC = () => {
  const location = useLocation();
  const [plans, setPlans] = useState<RelocationPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RelocationPlan | null>(null);
  const [availableSites, setAvailableSites] = useState<RelocationSite[]>([]);
  const [availableHabitations, setAvailableHabitations] = useState<Habitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New plan modal form
  const [newHabId, setNewHabId] = useState('');
  const [newSiteId, setNewSiteId] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [plansData, sitesData, habsData] = await Promise.all([
        relocationsApi.getAll({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search || undefined,
        }),
        sitesApi.getAll(),
        habitationsApi.getAll(),
      ]);

      setPlans(plansData);
      setAvailableSites(sitesData);
      setAvailableHabitations(habsData);

      // If location.state has createForHabitationId, trigger modal
      if (location.state && (location.state as any).createForHabitationId) {
        setNewHabId((location.state as any).createForHabitationId);
        setShowCreateModal(true);
      }

      // Default select first or keep existing
      if (plansData.length > 0) {
        if (!selectedPlan) {
          setSelectedPlan(plansData[0]);
        } else {
          const current = plansData.find((p) => p.id === selectedPlan.id);
          setSelectedPlan(current || plansData[0]);
        }
      }
    } catch {
      toast.error('Failed to load relocation plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [statusFilter, search]);

  const handleSelectSiteForPlan = async (siteId: string) => {
    if (!selectedPlan) return;
    try {
      const res = await relocationsApi.gate2Check(selectedPlan.id, siteId);
      const site = availableSites.find((s) => s.id === siteId);
      const updatedPlan: RelocationPlan = {
        ...selectedPlan,
        siteId: site?.id,
        siteName: site?.name,
        gate2: res.gate2,
      };
      setSelectedPlan(updatedPlan);
      // update list
      setPlans(plans.map((p) => (p.id === selectedPlan.id ? updatedPlan : p)));
      toast.success(`Evaluated Gate 2 for ${site?.name}`);
    } catch {
      toast.error('Failed to re-evaluate Gate 2');
    }
  };

  const handleApprove = async () => {
    if (!selectedPlan) return;
    if (!selectedPlan.gate1.passed) {
      toast.error('Gate 1 must pass before statutory approval!');
      return;
    }
    if (!selectedPlan.gate2 || !selectedPlan.gate2.passed) {
      toast.error('Gate 2 safe parcel capacity clearance must pass before approval!');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await relocationsApi.approve(selectedPlan.id, officerNotes);
      setSelectedPlan(updated);
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
      setOfficerNotes('');
      toast.success(`Relocation Order Approved & Gazetted!`);
    } catch {
      toast.error('Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPlan) return;
    if (!officerNotes.trim()) {
      toast.error('Please specify the rejection grounds in the notes panel.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await relocationsApi.reject(selectedPlan.id, officerNotes);
      setSelectedPlan(updated);
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
      setOfficerNotes('');
      toast.error(`Relocation Plan Rejected and Returned for Revision`);
    } catch {
      toast.error('Rejection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabId) {
      toast.error('Please select a settlement');
      return;
    }

    try {
      const created = await relocationsApi.create({
        habitationId: newHabId,
        siteId: newSiteId || undefined,
        title: newTitle || undefined,
      });
      setShowCreateModal(false);
      setPlans([created, ...plans]);
      setSelectedPlan(created);
      toast.success('Relocation Plan initiated with automated Gate 1 evaluation.');
    } catch {
      toast.error('Failed to create plan');
    }
  };

  const getStatusBadge = (status: PlanStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
            <CheckCircle2 size={11} /> APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-500/40 text-[10px] font-bold">
            <XCircle size={11} /> REJECTED
          </span>
        );
      case 'GATE2_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
            <AlertTriangle size={11} /> GATE 2 DEFICIENT
          </span>
        );
      case 'MONITORING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
            <Clock size={11} /> IN EXECUTION
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 text-[10px] font-bold">
            DRAFT / REVIEW
          </span>
        );
    }
  };

  const statusChips = ['ALL', 'DRAFT', 'APPROVED', 'GATE2_FAILED', 'REJECTED', 'MONITORING'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitPullRequest size={22} className="text-red-500" />
            <span>Two-Gate Relocation Approval Pipeline</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Statutory framework: Gate 1 Hazard Trigger Mandate ➔ Gate 2 Safe Capacity Clearance ➔ Executive Order
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs shadow-glow flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          <span>Initiate New Relocation Plan</span>
        </button>
      </div>

      {/* Main 2-Column Workflow Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
        {/* Left Column (5 cols): Plans List & Filter */}
        <div className="lg:col-span-4 bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col backdrop-blur-md">
          {/* Search & Status Filter */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search plan title, settlement, or site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
              {statusChips.map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all',
                    statusFilter === st
                      ? 'bg-red-600 text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Plans Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {plans.map((p) => {
              const isSelected = selectedPlan?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer relative',
                    isSelected
                      ? 'bg-gray-800/90 border-red-500/80 shadow-glow'
                      : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-gray-400">
                      {p.id} · {p.district}
                    </span>
                    {getStatusBadge(p.status)}
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">
                    {p.title}
                  </h4>

                  <div className="text-[11px] text-gray-400 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Flame size={12} className="text-red-400 shrink-0" />
                      <span className="truncate">Habitation: <strong className="text-gray-200">{p.habitationName}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles size={12} className="text-emerald-400 shrink-0" />
                      <span className="truncate">Candidate: <strong className="text-gray-200">{p.siteName || 'Not Assigned'}</strong></span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>{p.targetFamilies} Families</span>
                    <span>{formatDate(p.createdDate).split(',')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Plan Stepper & 2-Gate Decision Panel */}
        <div className="lg:col-span-8 bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
          {selectedPlan ? (
            <div className="space-y-6">
              {/* Plan Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                      {selectedPlan.district} · {selectedPlan.id}
                    </span>
                    {getStatusBadge(selectedPlan.status)}
                  </div>
                  <h3 className="text-lg font-extrabold text-white">
                    {selectedPlan.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                    <span>Target Families: <strong className="text-white font-mono">{selectedPlan.targetFamilies}</strong></span>
                    <span>Officer: <strong className="text-gray-300">{selectedPlan.officerName}</strong></span>
                  </div>
                </div>

                {/* Statutory Seal if Approved */}
                {selectedPlan.status === 'APPROVED' && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-3 text-emerald-300">
                    <ShieldCheck size={28} className="text-emerald-400 shrink-0 animate-pulse" />
                    <div className="text-left">
                      <div className="text-xs font-bold uppercase tracking-wider">
                        Gazetted Relocation Order
                      </div>
                      <div className="text-[10px] text-emerald-400/80 font-mono">
                        Sealed: {formatDate(selectedPlan.approvalTimestamp || selectedPlan.updatedDate)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Gate Visual Stepper UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* GATE 1: Threat Mandate Card */}
                <div
                  className={cn(
                    'p-5 rounded-xl border flex flex-col justify-between transition-all',
                    selectedPlan.gate1.passed
                      ? 'bg-red-950/20 border-red-500/50 shadow-glow'
                      : 'bg-gray-950/60 border-gray-800'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <Flame size={14} />
                        <span>Gate 1: Hazard Mandate</span>
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase',
                          selectedPlan.gate1.passed
                            ? 'bg-red-600 text-white shadow-glow'
                            : 'bg-gray-800 text-gray-400'
                        )}
                      >
                        {selectedPlan.gate1.passed ? 'PASSED (MANDATORY EVAC)' : 'FAIL / SUB-CRITICAL'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-gray-300">Vulnerability Score</span>
                          <span className="font-mono font-bold text-red-400">
                            {selectedPlan.gate1.score}% / Threshold {selectedPlan.gate1.threshold}%
                          </span>
                        </div>
                        <ScoreBar value={selectedPlan.gate1.score} showValue={false} size="sm" />
                      </div>

                      <div className="p-2.5 rounded-lg bg-gray-950/70 border border-gray-800 text-xs">
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">
                          Critical Hazard Trigger
                        </span>
                        <p className="text-gray-300 mt-0.5 leading-snug">
                          {selectedPlan.gate1.criticalTrigger}
                        </p>
                      </div>

                      {/* SHAP Mini Attributions */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
                        <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block">
                          Top Algorithmic Factors (TreeSHAP)
                        </span>
                        {selectedPlan.gate1.shapFactors.map((factor, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-300 truncate max-w-[200px]">
                              {factor.displayName}
                            </span>
                            <span className="font-mono text-red-400 font-bold">
                              +{(factor.value * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] text-gray-500 font-mono flex items-center justify-between">
                    <span>Evaluated: {formatDate(selectedPlan.gate1.evaluatedAt).split(',')[0]}</span>
                    <span className="text-emerald-400">GSI Verified</span>
                  </div>
                </div>

                {/* GATE 2: Safe Parcel Capacity Card */}
                <div
                  className={cn(
                    'p-5 rounded-xl border flex flex-col justify-between transition-all',
                    selectedPlan.gate2?.passed
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-glow-green'
                      : 'bg-gray-950/60 border-gray-800'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        <span>Gate 2: Capacity Clearance</span>
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase',
                          selectedPlan.gate2?.passed
                            ? 'bg-emerald-600 text-white shadow-glow-green'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        )}
                      >
                        {selectedPlan.gate2?.passed ? 'PASSED (SITE CERTIFIED)' : 'INSPECTION DEFICIT'}
                      </span>
                    </div>

                    {/* Site Selector Dropdown */}
                    <div className="mb-3">
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Assigned Resettlement Parcel
                      </label>
                      <select
                        value={selectedPlan.siteId || ''}
                        onChange={(e) => handleSelectSiteForPlan(e.target.value)}
                        disabled={selectedPlan.status === 'APPROVED'}
                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
                      >
                        <option value="">Select Candidate Resettlement Site...</option>
                        {availableSites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.capacityScore}% · {s.maxCapacityFamilies} families)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedPlan.gate2 ? (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-gray-300">Suitability Capacity Score</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {selectedPlan.gate2.score}% / Threshold {selectedPlan.gate2.threshold}%
                            </span>
                          </div>
                          <ScoreBar value={selectedPlan.gate2.score} showValue={false} size="sm" invertColor={true} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className={selectedPlan.gate2.waterClearance ? 'text-emerald-400' : 'text-rose-400'} />
                            <span className="truncate">Water Yield: {selectedPlan.gate2.waterClearance ? 'Vetted' : 'Deficit'}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className={selectedPlan.gate2.geotechClearance ? 'text-emerald-400' : 'text-rose-400'} />
                            <span className="truncate">Geotech: {selectedPlan.gate2.geotechClearance ? 'Stable' : 'Unstable'}</span>
                          </div>
                        </div>

                        {/* Recommended modifications */}
                        {selectedPlan.gate2.recommendedModifications && selectedPlan.gate2.recommendedModifications.length > 0 && (
                          <div className="p-2 rounded-lg bg-gray-950/60 border border-gray-800/80 text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-300 block mb-0.5">Civil Engineering Prerequisite:</span>
                            <ul className="list-disc list-inside space-y-0.5">
                              {selectedPlan.gate2.recommendedModifications.map((m, idx) => (
                                <li key={idx} className="truncate">{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-gray-500 border border-dashed border-gray-800 rounded-xl">
                        Select a candidate site from above to run automated Gate 2 suitability clearance.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800/80 text-[10px] text-gray-500 font-mono flex items-center justify-between">
                    <span>Evaluated: {formatDate(selectedPlan.gate2?.evaluatedAt || selectedPlan.updatedDate).split(',')[0]}</span>
                    <span className="text-emerald-400">Collector Certified</span>
                  </div>
                </div>
              </div>

              {/* Officer Endorsement & Action Panel */}
              <div className="p-5 rounded-xl bg-gray-950/70 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileCheck2 size={16} className="text-emerald-400" />
                    <span>Executive Officer Action & Endorsement Notes</span>
                  </h4>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Official Record ID: {selectedPlan.id}
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder="Record formal statutory rationale, budget allocation sanctions, or grounds for return/revision..."
                  disabled={selectedPlan.status === 'APPROVED'}
                  className="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                />

                {selectedPlan.notes && (
                  <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 text-xs text-gray-300 leading-relaxed font-mono">
                    <strong className="text-gray-400 block mb-1">Audit Log History:</strong>
                    {selectedPlan.notes}
                  </div>
                )}

                {/* Approve / Reject CTA Buttons */}
                {selectedPlan.status !== 'APPROVED' ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <XCircle size={15} />
                      <span>Reject & Request Alternative Parcel</span>
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting || !selectedPlan.gate1.passed || !selectedPlan.gate2?.passed}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-glow-green flex items-center gap-1.5 transition-all disabled:opacity-40"
                    >
                      <CheckCircle2 size={16} />
                      <span>{isSubmitting ? 'Sealing Gazette...' : 'Approve Statutory Relocation Order'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-right text-xs text-emerald-400 font-mono">
                    ✓ Statutory Order Executed & Immutable. Monitored under SDMA Protocol.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-gray-500 text-sm">
              Select a relocation plan from the left panel to review Gate 1 and Gate 2 evaluations.
            </div>
          )}
        </div>
      </div>

      {/* Initiate New Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitPullRequest size={18} className="text-red-500" />
                <span>Initiate Relocation Assessment Dossier</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg bg-gray-900 text-gray-400 hover:text-white"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewPlan} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Plan Title / File Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Relocation Plan: Chooralmala Resettlement"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Vulnerable Habitation (Gate 1 Focus) *
                </label>
                <select
                  value={newHabId}
                  onChange={(e) => setNewHabId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Select Vulnerable Settlement...</option>
                  {availableHabitations.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.district} · Risk: {h.combinedScore}% · {h.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Candidate Resettlement Parcel (Gate 2 Target)
                </label>
                <select
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Select Candidate Site (Optional)...</option>
                  {availableSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.district} · Capacity: {s.capacityScore}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-glow"
                >
                  Initiate Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
