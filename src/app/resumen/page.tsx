"use client";

import { useState, useEffect, useCallback } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency, MONTH_NAMES } from "@/lib/format";

export default function ResumenMensual() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/donations?year=${year}`);
    const data = await res.json();
    setDonations(data);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const validDonations = donations.filter((d) => d.status === "valido");
  const annualTotal = validDonations.reduce((sum, d) => sum + d.amount, 0);

  const monthlyData = MONTH_NAMES.map((name, i) => {
    const monthNum = (i + 1).toString().padStart(2, "0");
    const monthDonations = validDonations.filter((d) => {
      const dMonth = d.date.split("-")[1];
      return dMonth === monthNum;
    });
    const total = monthDonations.reduce((sum, d) => sum + d.amount, 0);
    const pct = annualTotal > 0 ? (total / annualTotal) * 100 : 0;
    return { name, count: monthDonations.length, total, pct };
  });

  const years = [];
  for (let y = 2024; y <= new Date().getFullYear() + 1; y++) {
    years.push(y);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy">Resumen Mensual</h2>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-4 py-2 text-navy font-medium focus:ring-2 focus:ring-gold outline-none bg-white"
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
          <div className="text-navy text-lg">Cargando...</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="px-4 py-3 text-left">Mes</th>
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
                    <td className="px-4 py-3 font-medium">{m.name}</td>
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
                    {validDonations.length}
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
