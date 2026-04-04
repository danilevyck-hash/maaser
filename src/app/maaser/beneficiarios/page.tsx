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
        <div className="text-[#1A3A5C] text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1A3A5C]">Por Beneficiario</h2>
        <p className="text-[#C9A84C] text-sm font-medium mt-0.5">Año Hebreo {hebrewYear}</p>
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
          className="w-full pl-10 pr-10 h-12 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
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
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-400 text-base">
          {search ? "No se encontraron beneficiarios" : "Sin donaciones aún"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.key} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Beneficiary header — tappable, min 44px tall */}
              <button
                onClick={() => toggleExpand(b.key)}
                className="w-full px-4 py-3 min-h-[56px] flex items-center justify-between text-left hover:bg-[#F5F0E8]/30 active:bg-[#F5F0E8]/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1A3A5C] text-base truncate">{b.name}</span>
                    <span className="text-sm text-gray-400 shrink-0">
                      {b.count} donación{b.count !== 1 ? "es" : ""}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#C9A84C] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 shrink-0 w-14 text-right">
                      {b.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-bold text-[#1A3A5C] text-lg whitespace-nowrap">
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

              {/* Expanded donation history — card list instead of table */}
              {expanded === b.key && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-[#F5F0E8]/20">
                  {b.donations.map((d, i) => (
                    <div
                      key={d.id}
                      className={`rounded-lg px-4 py-3 ${
                        i % 2 === 0 ? "bg-white" : "bg-[#F5F0E8]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-[#1A3A5C]">
                            {formatDate(d.date)}
                          </span>
                          {d.check_number && (
                            <span className="text-sm text-gray-400">
                              Cheque #{d.check_number}
                            </span>
                          )}
                        </div>
                        <span className="text-base font-bold text-[#1A3A5C]">
                          {formatCurrency(d.amount)}
                        </span>
                      </div>
                      {d.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          {d.notes}
                        </p>
                      )}
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
