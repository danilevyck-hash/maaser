"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";
import {
  getCurrentHebrewYear,
  getHebrewYearData,
  getAvailableHebrewYears,
} from "@/lib/hebrew-year";

export default function ResumenMensual() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [hebrewYear, setHebrewYear] = useState(getCurrentHebrewYear());
  const [loading, setLoading] = useState(true);

  const yearData = useMemo(() => getHebrewYearData(hebrewYear), [hebrewYear]);
  const availableYears = useMemo(() => getAvailableHebrewYears(), []);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/donations?from=${yearData.startDate}&to=${yearData.endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDonations(data);
      }
    } catch {
      // API error
    } finally {
      setLoading(false);
    }
  }, [yearData.startDate, yearData.endDate]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const annualTotal = donations.reduce((sum, d) => sum + d.amount, 0);

  const monthlyData = useMemo(() => {
    if (!yearData) return [];
    return yearData.months.map((month) => {
      const monthDonations = donations.filter(
        (d) => d.date >= month.startDate && d.date <= month.endDate
      );
      const total = monthDonations.reduce((sum, d) => sum + d.amount, 0);
      const pct = annualTotal > 0 ? (total / annualTotal) * 100 : 0;
      return {
        name: month.name,
        label: month.label,
        count: monthDonations.length,
        total,
        pct,
      };
    });
  }, [yearData, donations, annualTotal]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">Resumen Mensual</h2>
          <p className="text-gold text-sm font-medium mt-0.5">Año Hebreo {hebrewYear}</p>
        </div>
        <select
          value={hebrewYear}
          onChange={(e) => setHebrewYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
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
                  <th className="px-4 py-3 text-left">Mes Hebreo</th>
                  <th className="px-4 py-3 text-center">Nº Donaciones</th>
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
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{m.name}</span>
                        <span className="block text-xs text-gray-400">{m.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{m.count}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(m.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.pct > 0 ? `${m.pct.toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-navy text-white font-bold">
                  <td className="px-4 py-3">Total Anual</td>
                  <td className="px-4 py-3 text-center">
                    {donations.length}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(annualTotal)}
                  </td>
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
