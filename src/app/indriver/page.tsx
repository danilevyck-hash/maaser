"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Expense } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import ExpenseModal from "@/components/ExpenseModal";
import ExpenseExportModal from "@/components/ExpenseExportModal";
import ModuleLayout from "@/components/ModuleLayout";
import { useToast } from "@/components/Toast";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Tab = "gastos" | "resumen";

const tabItems = [
  {
    id: "gastos",
    label: "Gastos",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
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

export default function InDriverPage() {
  const [tab, setTab] = useState<Tab>("gastos");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const { showToast } = useToast();

  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateTo = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setExpenses(data);
      }
    } catch {
      showToast("Error al cargar gastos", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    fetchExpenses();
  }, [fetchExpenses]);

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const fetchAllExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAllExpenses(data);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchAllExpenses(); }, [fetchAllExpenses]);

  const handleSave = async (expense: Partial<Expense>) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: expense.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "Error al guardar", "error");
        return;
      }
      setModalOpen(false);
      setEditing(null);
      showToast(expense.id ? "Gasto actualizado" : "Gasto guardado");
      fetchExpenses();
      fetchAllExpenses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/expenses", {
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
    showToast("Gasto eliminado");
    fetchExpenses();
    fetchAllExpenses();
  };

  const years = useMemo(() => {
    const curr = new Date().getFullYear();
    return [curr, curr - 1, curr - 2];
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter((e) => e.notes?.toLowerCase().includes(q));
  }, [expenses, searchQuery]);

  return (
    <ModuleLayout
      title="InDriver"
      tabs={tabItems}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      {tab === "gastos" && (
        <div className="p-4 space-y-4">
          {/* Month/Year selector */}
          <div className="flex items-center justify-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-[#C6C6C8] rounded-lg px-3 py-2.5 h-11 text-[15px] text-[#1C1C1E] font-medium focus:ring-2 focus:ring-[#007AFF] outline-none bg-white"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-[#C6C6C8] rounded-lg px-3 py-2.5 h-11 text-[15px] text-[#1C1C1E] font-medium focus:ring-2 focus:ring-[#007AFF] outline-none bg-white"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* KPI */}
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-[13px] text-[#8E8E93] font-medium">Total {MONTHS[selectedMonth]}</p>
            <p className="text-[22px] font-bold text-[#1C1C1E] mt-1">{formatCurrency(totalMonth)}</p>
            <p className="text-[13px] text-[#8E8E93] mt-0.5">{expenses.length} gasto{expenses.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setExportOpen(true)}
              className="flex-1 h-11 rounded-xl border border-[#007AFF] text-[#007AFF] font-semibold text-[15px] bg-transparent cursor-pointer active:bg-[#007AFF]/10 transition-colors"
            >
              Exportar
            </button>
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="flex-1 h-11 rounded-xl bg-[#007AFF] text-white font-semibold text-[15px] border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
            >
              + Nuevo Gasto
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 border border-[#C6C6C8] rounded-xl text-[15px] text-[#1C1C1E] focus:ring-2 focus:ring-[#007AFF] outline-none bg-white"
            />
          </div>

          {/* Expense cards */}
          <div className="space-y-2">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#8E8E93] text-[15px]">Cargando...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#8E8E93] text-[15px]">
                {searchQuery.trim() ? "Sin resultados" : "Sin gastos este mes"}
              </div>
            ) : (
              filteredExpenses.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl shadow-sm p-4">
                  {confirmingDeleteId === e.id ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <span className="text-[15px] text-[#FF3B30] font-medium">Eliminar este gasto?</span>
                      <div className="flex gap-3 w-full">
                        <button onClick={() => handleDelete(e.id)} className="flex-1 h-11 rounded-lg bg-[#FF3B30] text-white font-semibold text-[15px] border-0 cursor-pointer">Si</button>
                        <button onClick={() => setConfirmingDeleteId(null)} className="flex-1 h-11 rounded-lg bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-[15px] border-0 cursor-pointer">No</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#8E8E93]">{formatDate(e.date)}</p>
                        {e.notes && <p className="text-[15px] text-[#1C1C1E] mt-1 break-words">{e.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="text-[17px] font-bold text-[#1C1C1E]">{formatCurrency(e.amount)}</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditing(e); setModalOpen(true); }}
                            className="h-11 w-11 flex items-center justify-center rounded-lg text-[#007AFF] active:bg-[#007AFF]/10 transition-colors bg-transparent border-0 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(e.id)}
                            className="h-11 w-11 flex items-center justify-center rounded-lg text-[#FF3B30] active:bg-[#FF3B30]/10 transition-colors bg-transparent border-0 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "resumen" && <ResumenTab />}

      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editingExpense={editing}
        saving={saving}
      />
      <ExpenseExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        expenses={allExpenses}
      />
    </ModuleLayout>
  );
}

/* ─── Resumen Tab ─── */
function ResumenTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?from=${year}-01-01&to=${year}-12-31`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setExpenses(data);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const annualTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const monthlyData = useMemo(() => {
    return MONTHS.map((name, i) => {
      const monthNum = String(i + 1).padStart(2, "0");
      const monthExpenses = expenses.filter((e) => e.date.split("-")[1] === monthNum);
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const pct = annualTotal > 0 ? (total / annualTotal) * 100 : 0;
      return { name, count: monthExpenses.length, total, pct };
    });
  }, [expenses, annualTotal]);

  const years = useMemo(() => {
    const curr = new Date().getFullYear();
    return [curr, curr - 1, curr - 2];
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[#1C1C1E]">Resumen Anual</h2>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="border border-[#C6C6C8] rounded-lg px-3 py-2.5 text-[15px] text-[#1C1C1E] font-medium focus:ring-2 focus:ring-[#007AFF] outline-none bg-white min-h-[44px]"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
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
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className={`text-[17px] font-bold ${m.total > 0 ? "text-[#1C1C1E]" : "text-[#8E8E93]"}`}>{formatCurrency(m.total)}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  {m.count} {m.count === 1 ? "gasto" : "gastos"}
                  {m.pct > 0 && <span className="ml-1 text-[#007AFF] font-medium">· {m.pct.toFixed(1)}%</span>}
                </p>
              </div>
            </div>
          ))}
          <div className="bg-[#007AFF] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[17px] font-bold text-white">Total Anual</p>
              <p className="text-[13px] text-white/70">{expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}</p>
            </div>
            <p className="text-[17px] font-bold text-white">{formatCurrency(annualTotal)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
