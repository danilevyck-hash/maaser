"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCurrentHebrewYear, getHebrewYearData, getAvailableHebrewYears } from "@/lib/hebrew-year";
import DonationModal from "@/components/DonationModal";
import ExportModal from "@/components/ExportModal";
import ModuleLayout from "@/components/ModuleLayout";
import { useToast } from "@/components/Toast";

type Tab = "dashboard" | "beneficiarios" | "resumen";

const tabItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    id: "beneficiarios",
    label: "Beneficiarios",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: "resumen",
    label: "Resumen",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function MaaserPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [goalAmount, setGoalAmount] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const { showToast } = useToast();

  const hebrewYear = useMemo(() => getCurrentHebrewYear(), []);
  const yearData = useMemo(() => getHebrewYearData(hebrewYear), [hebrewYear]);

  const fetchDonations = useCallback(async () => {
    try {
      const res = await fetch(`/api/donations?from=${yearData.startDate}&to=${yearData.endDate}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDonations(data);
      }
    } catch {
      showToast("Error al cargar donaciones", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearData.startDate, yearData.endDate]);

  const fetchGoal = useCallback(async () => {
    try {
      const res = await fetch(`/api/goal?year=${hebrewYear}`);
      if (res.ok) {
        const data = await res.json();
        setGoalAmount(data.goal_amount || 0);
        setGoalInput((data.goal_amount || 0).toString());
      }
    } catch {
      showToast("Error al cargar meta", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hebrewYear]);

  useEffect(() => {
    fetchDonations();
    fetchGoal();
  }, [fetchDonations, fetchGoal]);

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const donationCount = donations.length;
  const goalProgress = goalAmount > 0 ? Math.min((totalDonated / goalAmount) * 100, 100) : 0;
  const remaining = goalAmount > 0 ? Math.max(goalAmount - totalDonated, 0) : 0;

  const filteredDonations = useMemo(() => {
    if (!search.trim()) return donations;
    const q = search.trim().toLowerCase();
    return donations.filter((d) => d.beneficiary.toLowerCase().includes(q));
  }, [donations, search]);

  const handleSave = async (donation: Partial<Donation>) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/donations", {
        method: donation.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donation),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "Error al guardar", "error");
        return;
      }
      setModalOpen(false);
      setEditing(null);
      showToast(donation.id ? "Donación actualizada" : "Donación guardada");
      fetchDonations();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/donations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "Error al eliminar", "error");
        setConfirmingDeleteId(null);
        return;
      }
      setConfirmingDeleteId(null);
      showToast("Donación eliminada");
      fetchDonations();
    } catch {
      showToast("Error al eliminar", "error");
    } finally {
      setDeleting(false);
    }
  };

  const saveGoal = async () => {
    const amount = parseFloat(goalInput) || 0;
    try {
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: hebrewYear, goal_amount: amount }),
      });
      if (!res.ok) {
        showToast("Error al guardar meta", "error");
        return;
      }
      setGoalAmount(amount);
      setEditingGoal(false);
      showToast("Meta guardada");
    } catch {
      showToast("Error al guardar meta", "error");
    }
  };

  return (
    <ModuleLayout
      title="Maaser"
      tabs={tabItems}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-[#8E8E93] text-[15px]">Cargando...</div>
        </div>
      ) : (
        <>
          {tab === "dashboard" && (
            <DashboardContent
              filteredDonations={filteredDonations}
              totalDonated={totalDonated}
              donationCount={donationCount}
              goalAmount={goalAmount}
              goalInput={goalInput}
              goalProgress={goalProgress}
              remaining={remaining}
              editingGoal={editingGoal}
              hebrewYear={hebrewYear}
              search={search}
              confirmingDeleteId={confirmingDeleteId}
              setGoalInput={setGoalInput}
              setEditingGoal={setEditingGoal}
              saveGoal={saveGoal}
              setSearch={setSearch}
              setExportOpen={setExportOpen}
              setModalOpen={setModalOpen}
              setEditing={setEditing}
              setConfirmingDeleteId={setConfirmingDeleteId}
              handleDelete={handleDelete}
              deleting={deleting}
            />
          )}
          {tab === "beneficiarios" && (
            <BeneficiariosContent donations={donations} hebrewYear={hebrewYear} totalDonated={totalDonated} />
          )}
          {tab === "resumen" && (
            <ResumenContent />
          )}
        </>
      )}

      <DonationModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editingDonation={editing}
        saving={saving}
      />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        donations={donations}
      />
    </ModuleLayout>
  );
}

/* ─── Dashboard Tab ─── */
function DashboardContent({
  filteredDonations, totalDonated, donationCount, goalAmount, goalInput,
  goalProgress, remaining, editingGoal, hebrewYear, search, confirmingDeleteId,
  setGoalInput, setEditingGoal, saveGoal, setSearch, setExportOpen, setModalOpen,
  setEditing, setConfirmingDeleteId, handleDelete, deleting,
}: {
  filteredDonations: Donation[];
  totalDonated: number;
  donationCount: number;
  goalAmount: number;
  goalInput: string;
  goalProgress: number;
  remaining: number;
  editingGoal: boolean;
  hebrewYear: number;
  search: string;
  confirmingDeleteId: number | null;
  setGoalInput: (v: string) => void;
  setEditingGoal: (v: boolean) => void;
  saveGoal: () => void;
  setSearch: (v: string) => void;
  setExportOpen: (v: boolean) => void;
  setModalOpen: (v: boolean) => void;
  setEditing: (v: Donation | null) => void;
  setConfirmingDeleteId: (v: number | null) => void;
  handleDelete: (id: number) => void;
  deleting: boolean;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Hebrew Year */}
      <div className="text-center">
        <p className="text-[#007AFF] font-semibold text-[15px]">Ano Hebreo {hebrewYear}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[13px] text-[#8E8E93] font-medium">Total Donado</p>
          <p className="text-[22px] font-bold text-[#1C1C1E] mt-1">{formatCurrency(totalDonated)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[13px] text-[#8E8E93] font-medium">Donaciones</p>
          <p className="text-[22px] font-bold text-[#1C1C1E] mt-1">{donationCount}</p>
        </div>
      </div>

      {/* Goal */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[17px] text-[#1C1C1E]">Meta Anual</h3>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="border border-[#C6C6C8] rounded-lg px-3 py-2 w-24 text-[15px] focus:ring-2 focus:ring-[#007AFF] outline-none"
              />
              <button onClick={saveGoal} className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer">OK</button>
              <button onClick={() => setEditingGoal(false)} className="text-[#8E8E93] text-[15px] bg-transparent border-0 cursor-pointer">X</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer"
            >
              {goalAmount > 0 ? `${formatCurrency(goalAmount)} - Editar` : "Establecer"}
            </button>
          )}
        </div>
        {goalAmount > 0 && (
          <>
            <div className="w-full bg-[#E5E5EA] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#007AFF] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[13px] mt-2 text-[#8E8E93]">
              <span>{goalProgress.toFixed(1)}%</span>
              <span>Falta: {formatCurrency(remaining)}</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setExportOpen(true)}
          className="flex-1 h-12 rounded-xl border border-[#007AFF] text-[#007AFF] font-semibold text-[15px] bg-transparent cursor-pointer active:bg-[#007AFF]/10 transition-colors"
        >
          Exportar
        </button>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex-1 h-12 rounded-xl bg-[#007AFF] text-white font-semibold text-[15px] border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
        >
          + Nueva Donación
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar beneficiario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 h-11 border border-[#C6C6C8] rounded-xl text-[15px] focus:ring-2 focus:ring-[#007AFF] outline-none bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] h-11 w-11 flex items-center justify-center bg-transparent border-0 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Donation cards */}
      <div className="space-y-2">
        {filteredDonations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-[#8E8E93] text-[15px]">
              {search ? `Sin resultados para "${search}"` : "No hay donaciones registradas"}
            </p>
          </div>
        ) : (
          filteredDonations.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{d.beneficiary}</p>
                  <p className="text-[13px] text-[#8E8E93] mt-0.5">
                    {formatDate(d.date)}
                    {d.check_number && <span className="ml-2 font-mono">#{d.check_number}</span>}
                  </p>
                </div>
                <p className="text-[17px] font-bold text-[#1C1C1E] whitespace-nowrap">
                  {formatCurrency(d.amount)}
                </p>
              </div>
              {d.notes && (
                <p className="text-[13px] text-[#8E8E93] mt-2 bg-[#F2F2F7] rounded-lg px-3 py-2">{d.notes}</p>
              )}
              {confirmingDeleteId === d.id ? (
                <div className="mt-3 pt-3 border-t border-[#C6C6C8]">
                  <p className="text-[13px] text-[#FF3B30] font-medium mb-2">¿Eliminar esta donación?</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(d.id)} disabled={deleting} className="flex-1 h-11 rounded-lg bg-[#FF3B30] text-white font-semibold text-[15px] border-0 cursor-pointer disabled:opacity-50">{deleting ? "..." : "Si"}</button>
                    <button onClick={() => setConfirmingDeleteId(null)} className="flex-1 h-11 rounded-lg bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-[15px] border-0 cursor-pointer">No</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-[#F2F2F7] flex justify-end gap-2">
                  <button
                    onClick={() => { setEditing(d); setModalOpen(true); }}
                    className="h-11 w-11 flex items-center justify-center rounded-lg text-[#007AFF] active:bg-[#007AFF]/10 transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmingDeleteId(d.id)}
                    className="h-11 w-11 flex items-center justify-center rounded-lg text-[#FF3B30] active:bg-[#FF3B30]/10 transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Beneficiarios Tab ─── */
function BeneficiariosContent({ donations, hebrewYear, totalDonated }: { donations: Donation[]; hebrewYear: number; totalDonated: number }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const beneficiarySummary = useMemo(() => {
    const map = new Map<string, { displayName: string; count: number; total: number; donations: Donation[] }>();
    donations.forEach((d) => {
      const key = d.beneficiary.trim().toLowerCase();
      const entry = map.get(key) || { displayName: d.beneficiary.trim(), count: 0, total: 0, donations: [] };
      entry.count += 1;
      entry.total += d.amount;
      entry.donations.push(d);
      map.set(key, entry);
    });
    return Array.from(map.values())
      .map((data) => ({
        name: data.displayName,
        key: data.displayName.trim().toLowerCase(),
        count: data.count,
        total: data.total,
        pct: totalDonated > 0 ? (data.total / totalDonated) * 100 : 0,
        donations: data.donations.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => b.total - a.total);
  }, [donations, totalDonated]);

  const filtered = useMemo(() => {
    if (!search.trim()) return beneficiarySummary;
    const q = search.trim().toLowerCase();
    return beneficiarySummary.filter((b) => b.name.toLowerCase().includes(q));
  }, [beneficiarySummary, search]);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <p className="text-[#007AFF] text-[13px] font-medium">Ano Hebreo {hebrewYear}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar beneficiario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 h-11 border border-[#C6C6C8] rounded-xl text-[15px] focus:ring-2 focus:ring-[#007AFF] outline-none bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] bg-transparent border-0 cursor-pointer p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <p className="text-[13px] text-[#8E8E93]">
        {filtered.length} beneficiario{filtered.length !== 1 ? "s" : ""} · {formatCurrency(totalDonated)} total
      </p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#8E8E93] text-[15px]">
          {search ? "Sin resultados" : "Sin donaciones"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => (
            <div key={b.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === b.key ? null : b.key)}
                className="w-full px-4 py-3 min-h-[56px] flex items-center justify-between text-left active:bg-[#F2F2F7] transition-colors bg-transparent border-0 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1C1C1E] text-[15px] truncate">{b.name}</span>
                    <span className="text-[13px] text-[#8E8E93] shrink-0">{b.count}x</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-[#E5E5EA] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#007AFF] h-1.5 rounded-full transition-all" style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="text-[13px] text-[#8E8E93] shrink-0 w-12 text-right">{b.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="font-bold text-[#1C1C1E] text-[17px] whitespace-nowrap">{formatCurrency(b.total)}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-[#C6C6C8] transition-transform ${expanded === b.key ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expanded === b.key && (
                <div className="border-t border-[#F2F2F7] px-4 py-3 space-y-1.5 bg-[#F2F2F7]/50">
                  {b.donations.map((d) => (
                    <div key={d.id} className="bg-white rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[13px] text-[#1C1C1E]">{formatDate(d.date)}</span>
                          {d.check_number && <span className="text-[13px] text-[#8E8E93] ml-2">#{d.check_number}</span>}
                        </div>
                        <span className="text-[15px] font-semibold text-[#1C1C1E]">{formatCurrency(d.amount)}</span>
                      </div>
                      {d.notes && <p className="text-[13px] text-[#8E8E93] mt-1">{d.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Resumen Tab ─── */
function ResumenContent() {
  const { showToast } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [hebrewYear, setHebrewYear] = useState(getCurrentHebrewYear());
  const [loading, setLoading] = useState(true);

  const yearData = useMemo(() => getHebrewYearData(hebrewYear), [hebrewYear]);
  const availableYears = useMemo(() => getAvailableHebrewYears(), []);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/donations?from=${yearData.startDate}&to=${yearData.endDate}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDonations(data);
      }
    } catch {
      showToast("Error al cargar donaciones", "error");
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearData.startDate, yearData.endDate]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const annualTotal = donations.reduce((sum, d) => sum + d.amount, 0);

  const monthlyData = useMemo(() => {
    if (!yearData) return [];
    return yearData.months.map((month) => {
      const monthDonations = donations.filter((d) => d.date >= month.startDate && d.date <= month.endDate);
      const total = monthDonations.reduce((sum, d) => sum + d.amount, 0);
      const pct = annualTotal > 0 ? (total / annualTotal) * 100 : 0;
      return { name: month.name, label: month.label, count: monthDonations.length, total, pct };
    });
  }, [yearData, donations, annualTotal]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">Resumen Mensual</h2>
          <p className="text-[#007AFF] text-[13px] font-medium mt-0.5">Ano Hebreo {hebrewYear}</p>
        </div>
        <select
          value={hebrewYear}
          onChange={(e) => setHebrewYear(parseInt(e.target.value))}
          className="border border-[#C6C6C8] rounded-lg px-3 py-2.5 text-[15px] text-[#1C1C1E] font-medium focus:ring-2 focus:ring-[#007AFF] outline-none bg-white min-h-[44px]"
        >
          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-[#8E8E93] text-[15px]">Cargando...</div>
        </div>
      ) : (
        <div className="space-y-2">
          {monthlyData.map((m) => (
            <div key={m.name} className={`bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between min-h-[44px] ${m.total === 0 ? "opacity-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-semibold ${m.total > 0 ? "text-[#1C1C1E]" : "text-[#8E8E93]"}`}>{m.name}</p>
                <p className="text-[13px] text-[#8E8E93] truncate">{m.label}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className={`text-[17px] font-bold ${m.total > 0 ? "text-[#1C1C1E]" : "text-[#8E8E93]"}`}>{formatCurrency(m.total)}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  {m.count} {m.count === 1 ? "donación" : "donaciones"}
                  {m.pct > 0 && <span className="ml-1 text-[#007AFF] font-medium">· {m.pct.toFixed(1)}%</span>}
                </p>
              </div>
            </div>
          ))}
          {/* Total */}
          <div className="bg-[#007AFF] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[17px] font-bold text-white">Total Anual</p>
              <p className="text-[13px] text-white/70">{donations.length} {donations.length === 1 ? "donación" : "donaciones"}</p>
            </div>
            <p className="text-[17px] font-bold text-white">{formatCurrency(annualTotal)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
