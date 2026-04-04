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
    if (!confirm("¿Eliminar este gasto?")) return;
    const res = await fetch("/api/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      showToast(err?.error || "Error al eliminar el gasto", "error");
      return;
    }
    showToast("Gasto eliminado");
    fetchExpenses();
    fetchAllExpenses();
  };

  const years = useMemo(() => {
    const curr = new Date().getFullYear();
    return [curr, curr - 1, curr - 2];
  }, []);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span className="text-sm">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600 font-bold ml-3">&times;</button>
        </div>
      )}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">Gastos InDriver</h1>
      </div>

      {/* Month/Year selector */}
      <div className="flex items-center justify-center gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPI */}
      <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gold text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide">Total {MONTHS[selectedMonth]}</p>
        <p className="text-2xl font-bold text-navy mt-1">{formatCurrency(totalMonth)}</p>
        <p className="text-sm text-gray-400 mt-1">{expenses.length} gasto{expenses.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={() => setExportOpen(true)}
          className="bg-white border-2 border-navy text-navy hover:bg-navy hover:text-white font-bold px-5 py-3 rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar
        </button>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-gold hover:bg-yellow-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <span className="text-xl">+</span> Nuevo Gasto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Notas</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin gastos este mes</td></tr>
              ) : (
                expenses.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-cream/50"}`}
                  >
                    <td className="px-4 py-3 font-medium">{expenses.length - i}</td>
                    <td className="px-4 py-3">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {e.notes ? (
                        <span className="block truncate cursor-help" title={e.notes}>{e.notes}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setEditing(e); setModalOpen(true); }}
                          className="text-navy hover:text-gold transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
