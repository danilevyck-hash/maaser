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
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A3A5C]">Resumen Mensual</h2>
          <p className="text-[#C9A84C] text-sm font-medium mt-0.5">
            Año Hebreo {hebrewYear}
          </p>
        </div>
        <select
          value={hebrewYear}
          onChange={(e) => setHebrewYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-3 text-base text-[#1A3A5C] font-medium focus:ring-2 focus:ring-[#C9A84C] outline-none bg-white min-h-[44px]"
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
              {/* Left: month name + date range */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-base font-bold ${
                    m.total > 0 ? "text-[#1A3A5C]" : "text-gray-400"
                  }`}
                >
                  {m.name}
                </p>
                <p className="text-sm text-gray-400 truncate">{m.label}</p>
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
                  {m.count} {m.count === 1 ? "donación" : "donaciones"}
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
                {donations.length}{" "}
                {donations.length === 1 ? "donación" : "donaciones"}
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
