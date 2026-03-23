"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PersonalExpense, CATEGORY_COLORS } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import PersonalExpenseModal from "@/components/PersonalExpenseModal";
import PersonalExpenseExportModal from "@/components/PersonalExpenseExportModal";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function GastosPage() {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalExpense | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateTo = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/personal-expenses?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setExpenses(data);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    fetchExpenses();
  }, [fetchExpenses]);

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  // For export modal
  const [allExpenses, setAllExpenses] = useState<PersonalExpense[]>([]);
  const fetchAllExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/personal-expenses");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAllExpenses(data);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

  const handleSave = async (expense: Partial<PersonalExpense>) => {
    if (expense.id) {
      await fetch("/api/personal-expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
    } else {
      await fetch("/api/personal-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
    }
    setModalOpen(false);
    setEditing(null);
    fetchExpenses();
    fetchAllExpenses();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await fetch("/api/personal-expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchExpenses();
    fetchAllExpenses();
  };

  const years = useMemo(() => {
    const curr = new Date().getFullYear();
    return [curr, curr - 1, curr - 2];
  }, []);

  // Category breakdown for chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, total]) => ({
        name,
        total,
        pct: totalMonth > 0 ? (total / totalMonth) * 100 : 0,
        color: CATEGORY_COLORS[name] || "#95A5A6",
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalMonth]);

  // Payment method breakdown
  const methodData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.payment_method] = (map[e.payment_method] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total, pct: totalMonth > 0 ? (total / totalMonth) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalMonth]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">MiFinanzas</h1>
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

      {/* Category Chart */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="text-lg font-bold text-navy mb-4">Gastos por Categoría</h2>
          <div className="space-y-3">
            {categoryData.map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-navy">{cat.name}</span>
                  <span className="text-gray-600">
                    {formatCurrency(cat.total)} ({cat.pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Donut-style visual: stacked bar */}
          <div className="mt-5 flex rounded-full h-6 overflow-hidden">
            {categoryData.map((cat) => (
              <div
                key={cat.name}
                className="h-full transition-all duration-500"
                style={{
                  width: `${cat.pct}%`,
                  backgroundColor: cat.color,
                  minWidth: cat.pct > 0 ? "4px" : "0",
                }}
                title={`${cat.name}: ${cat.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-gray-600">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Method Breakdown */}
      {methodData.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="text-lg font-bold text-navy mb-3">Por Método de Pago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {methodData.map((m) => (
              <div key={m.name} className="bg-cream/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 uppercase">{m.name}</p>
                <p className="text-lg font-bold text-navy">{formatCurrency(m.total)}</p>
                <p className="text-xs text-gray-400">{m.pct.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <th className="px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-right">Monto</th>
                <th className="px-3 py-3 text-left">Categoría</th>
                <th className="px-3 py-3 text-left">Subcategoría</th>
                <th className="px-3 py-3 text-left">Método</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin gastos este mes</td></tr>
              ) : (
                expenses.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-cream/50"}`}
                  >
                    <td className="px-3 py-3 font-medium">{expenses.length - i}</td>
                    <td className="px-3 py-3">{formatDate(e.date)}</td>
                    <td className="px-3 py-3 text-right font-medium">{formatCurrency(e.amount)}</td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[e.category] || "#95A5A6" }}
                      >
                        {e.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {e.subcategory ? (
                        <span className="block truncate max-w-[120px] cursor-help" title={e.subcategory}>{e.subcategory}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">{e.payment_method}</td>
                    <td className="px-3 py-3 text-center">
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

      <PersonalExpenseModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editingExpense={editing}
      />

      <PersonalExpenseExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        expenses={allExpenses}
      />
    </div>
  );
}
