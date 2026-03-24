"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCurrentHebrewYear, getHebrewYearData } from "@/lib/hebrew-year";

export default function BeneficiariosPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const hebrewYear = useMemo(() => getCurrentHebrewYear(), []);
  const yearData = useMemo(() => getHebrewYearData(hebrewYear), [hebrewYear]);

  const fetchDonations = useCallback(async () => {
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

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  // Group by beneficiary — case-insensitive, trim whitespace
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

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return beneficiarySummary;
    const q = search.trim().toLowerCase();
    return beneficiarySummary.filter((b) => b.name.toLowerCase().includes(q));
  }, [beneficiarySummary, search]);

  const toggleExpand = (key: string) => {
    setExpanded(expanded === key ? null : key);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-navy text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-navy">Por Beneficiario</h2>
        <p className="text-gold text-sm font-medium mt-0.5">Año Hebreo {hebrewYear}</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Buscar beneficiario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gold focus:border-gold outline-none bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Summary count */}
      <p className="text-sm text-gray-500">
        {filtered.length} beneficiario{filtered.length !== 1 ? "s" : ""} · {formatCurrency(totalDonated)} total
      </p>

      {/* Beneficiary cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-400">
          {search ? "No se encontraron beneficiarios" : "Sin donaciones aún"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.key} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Beneficiary header — tappable */}
              <button
                onClick={() => toggleExpand(b.key)}
                className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-cream/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy truncate">{b.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {b.count} donación{b.count !== 1 ? "es" : ""}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gold h-2 rounded-full transition-all duration-300"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 w-12 text-right">
                      {b.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-bold text-navy text-lg whitespace-nowrap">
                    {formatCurrency(b.total)}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                      expanded === b.key ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded donation history */}
              {expanded === b.key && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-navy/5">
                        <th className="px-4 py-2 text-left text-xs text-navy font-semibold">Fecha</th>
                        <th className="px-4 py-2 text-center text-xs text-navy font-semibold">Cheque</th>
                        <th className="px-4 py-2 text-right text-xs text-navy font-semibold">Monto</th>
                        <th className="px-4 py-2 text-left text-xs text-navy font-semibold">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.donations.map((d, i) => (
                        <tr
                          key={d.id}
                          className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-cream/30"}`}
                        >
                          <td className="px-4 py-2.5">{formatDate(d.date)}</td>
                          <td className="px-4 py-2.5 text-center font-mono text-xs">
                            {d.check_number || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(d.amount)}</td>
                          <td className="px-4 py-2.5 max-w-[120px]">
                            {d.notes ? (
                              <span className="block truncate text-xs text-gray-500" title={d.notes}>
                                {d.notes}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
