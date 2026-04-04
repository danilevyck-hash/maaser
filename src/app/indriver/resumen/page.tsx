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
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A3A5C]">Resumen Mensual</h2>
          <p className="text-[#C9A84C] text-sm font-medium mt-0.5">
            Gastos InDriver
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-3 text-base text-[#1A3A5C] font-medium focus:ring-2 focus:ring-[#C9A84C] outline-none bg-white min-h-[44px]"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#1A3A5C] text-lg">Cargando...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Month cards */}
          {monthlyData.map((m) => (
            <div
              key={m.name}
              className={`bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between min-h-[44px] ${
                m.total > 0
                  ? "border-gray-200"
                  : "border-gray-100 opacity-50"
              }`}
            >
              {/* Left: month name */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-base font-bold ${
                    m.total > 0 ? "text-[#1A3A5C]" : "text-gray-400"
                  }`}
                >
                  {m.name}
                </p>
              </div>

              {/* Right: count + total */}
              <div className="text-right ml-4 flex-shrink-0">
                <p
                  className={`text-lg font-bold ${
                    m.total > 0 ? "text-[#1A3A5C]" : "text-gray-400"
                  }`}
                >
                  {formatCurrency(m.total)}
                </p>
                <p className="text-sm text-gray-400">
                  {m.count} {m.count === 1 ? "gasto" : "gastos"}
                  {m.pct > 0 && (
                    <span className="ml-1 text-[#C9A84C] font-medium">
                      · {m.pct.toFixed(1)}%
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}

          {/* Annual total summary card */}
          <div className="bg-[#1A3A5C] rounded-xl shadow-md p-5 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white">Total Anual</p>
              <p className="text-sm text-[#C9A84C]">
                {expenses.length}{" "}
                {expenses.length === 1 ? "gasto" : "gastos"}
              </p>
            </div>
            <p className="text-lg font-bold text-white">
              {formatCurrency(annualTotal)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
