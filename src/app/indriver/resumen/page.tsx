"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Expense } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function InDriverResumen() {
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
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">Resumen Mensual</h2>
          <p className="text-gold text-sm font-medium mt-0.5">Gastos InDriver</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-navy text-lg">Cargando...</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-4 py-3 text-left">Mes</th>
                  <th className="px-4 py-3 text-center">Nº Gastos</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">% del Total Anual</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => (
                  <tr
                    key={m.name}
                    className={`border-b border-gray-100 ${
                      i % 2 === 0 ? "bg-white" : "bg-cream/50"
                    } ${m.total > 0 ? "" : "text-gray-400"}`}
                  >
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-center">{m.count}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(m.total)}</td>
                    <td className="px-4 py-3 text-right">
                      {m.pct > 0 ? `${m.pct.toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-navy text-white font-bold">
                  <td className="px-4 py-3">Total Anual</td>
                  <td className="px-4 py-3 text-center">{expenses.length}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(annualTotal)}</td>
                  <td className="px-4 py-3 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
