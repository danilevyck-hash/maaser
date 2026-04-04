"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Expense } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import ExpenseModal from "@/components/ExpenseModal";
import ExpenseExportModal from "@/components/ExpenseExportModal";
import { useToast } from "@/components/Toast";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function InDriverPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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

  // For export, fetch ALL expenses (no date filter)
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

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

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
        const msg = err?.error || "Error al guardar el gasto";
        setErrorMsg(msg);
        showToast(msg, "error");
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
      showToast(err?.error || "Error al eliminar el gasto", "error");
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
    <div className="space-y-5">
      {/* Error banner */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span className="text-sm">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600 font-bold ml-3">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">Gastos InDriver</h1>
      </div>

      {/* Month/Year selector */}
      <div className="flex items-center justify-center gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 h-11 text-base text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 h-11 text-base text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPI */}
      <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gold text-center">
        <p className="text-base text-gray-500 uppercase tracking-wide">Total {MONTHS[selectedMonth]}</p>
        <p className="text-2xl font-bold text-navy mt-1">{formatCurrency(totalMonth)}</p>
        <p className="text-sm text-gray-400 mt-1">{expenses.length} gasto{expenses.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => setExportOpen(true)}
          className="bg-white border-2 border-navy text-navy hover:bg-navy hover:text-white font-bold px-5 h-11 rounded-xl shadow-md transition-colors flex items-center gap-2 text-base"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar
        </button>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-gold hover:bg-yellow-600 text-white font-bold px-6 h-11 rounded-xl shadow-md transition-colors flex items-center gap-2 text-base"
        >
          <span className="text-xl leading-none">+</span> Nuevo Gasto
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 border border-gray-300 rounded-xl text-base text-navy focus:ring-2 focus:ring-gold outline-none bg-white"
        />
      </div>

      {/* Expense cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-400 text-base">
            Cargando...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-400 text-base">
            {searchQuery.trim() ? "Sin resultados" : "Sin gastos este mes"}
          </div>
        ) : (
          filteredExpenses.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-xl shadow-md p-4 border-l-4 border-cream"
            >
              {confirmingDeleteId === e.id ? (
                /* Inline delete confirmation */
                <div className="flex flex-col items-center gap-3 py-2">
                  <span className="text-base text-red-600 font-medium">
                    ¿Eliminar este gasto?
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 h-11 rounded-xl text-base transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 h-11 rounded-xl text-base transition-colors"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal card content */
                <div className="flex items-start justify-between gap-3">
                  {/* Left side: date + notes */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">{formatDate(e.date)}</p>
                    {e.notes && (
                      <p className="text-sm text-gray-600 mt-1 break-words">{e.notes}</p>
                    )}
                  </div>

                  {/* Right side: amount + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-lg font-bold text-navy">{formatCurrency(e.amount)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditing(e); setModalOpen(true); }}
                        className="h-11 w-11 flex items-center justify-center rounded-lg text-navy hover:bg-cream transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(e.id)}
                        className="h-11 w-11 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Eliminar"
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
    </div>
  );
}
