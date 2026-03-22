"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCurrentHebrewYear, getHebrewYearData } from "@/lib/hebrew-year";
import DonationModal from "@/components/DonationModal";
import ExportModal from "@/components/ExportModal";

export default function Dashboard() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [goalAmount, setGoalAmount] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);


  const hebrewYear = getCurrentHebrewYear();
  const yearData = getHebrewYearData(hebrewYear);

  const fetchDonations = useCallback(async () => {
    if (!yearData) return;
    const res = await fetch(
      `/api/donations?from=${yearData.startDate}&to=${yearData.endDate}`
    );
    const data = await res.json();
    setDonations(data);
    setLoading(false);
  }, [yearData]);

  const fetchGoal = useCallback(async () => {
    const res = await fetch(`/api/goal?year=${hebrewYear}`);
    const data = await res.json();
    setGoalAmount(data.goal_amount || 0);
    setGoalInput((data.goal_amount || 0).toString());
  }, [hebrewYear]);

  useEffect(() => {
    fetchDonations();
    fetchGoal();
  }, [fetchDonations, fetchGoal]);

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const donationCount = donations.length;
  const goalProgress = goalAmount > 0 ? Math.min((totalDonated / goalAmount) * 100, 100) : 0;
  const remaining = goalAmount > 0 ? Math.max(goalAmount - totalDonated, 0) : 0;

  const beneficiarySummary = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    donations.forEach((d) => {
      const key = d.beneficiary;
      const entry = map.get(key) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += d.amount;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        pct: totalDonated > 0 ? (data.total / totalDonated) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [donations, totalDonated]);

  const handleSave = async (donation: Partial<Donation>) => {
    if (donation.id) {
      await fetch("/api/donations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donation),
      });
    } else {
      await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donation),
      });
    }
    setModalOpen(false);
    setEditing(null);
    fetchDonations();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta donación?")) return;
    await fetch("/api/donations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchDonations();
  };

  const saveGoal = async () => {
    const amount = parseFloat(goalInput) || 0;
    await fetch("/api/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: hebrewYear, goal_amount: amount }),
    });
    setGoalAmount(amount);
    setEditingGoal(false);
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
      {/* Hebrew Year Header */}
      <div className="text-center">
        <p className="text-gold font-medium text-sm tracking-wide">
          Año Hebreo {hebrewYear}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gold">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Total Donado</p>
          <p className="text-2xl font-bold text-navy mt-1">{formatCurrency(totalDonated)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-navy">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Nº Donaciones</p>
          <p className="text-2xl font-bold text-navy mt-1">{donationCount}</p>
        </div>
      </div>

      {/* Annual Goal */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy text-lg">Meta Anual {hebrewYear}</h3>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 w-32 text-sm focus:ring-2 focus:ring-gold outline-none"
              />
              <button
                onClick={saveGoal}
                className="bg-gold text-white text-sm px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingGoal(false)}
                className="text-gray-500 text-sm px-2 py-1.5 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              className="text-gold hover:text-yellow-600 text-sm font-medium"
            >
              {goalAmount > 0 ? `Meta: ${formatCurrency(goalAmount)} — Editar` : "Establecer meta"}
            </button>
          )}
        </div>
        {goalAmount > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gold to-yellow-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm mt-2 text-gray-600">
              <span>{goalProgress.toFixed(1)}% completado</span>
              <span>Falta: {formatCurrency(remaining)}</span>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
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
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="bg-gold hover:bg-yellow-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <span className="text-xl">+</span> Nueva Donación
        </button>
      </div>

      {/* Donations Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Beneficiario</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Notas</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, i) => (
                <tr
                  key={d.id}
                  className={`border-b border-gray-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-cream/50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{i + 1}</td>
                  <td className="px-4 py-3">{formatDate(d.date)}</td>
                  <td className="px-4 py-3">{d.beneficiary}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-3 max-w-[150px]">
                    {d.notes ? (
                      <span
                        className="block truncate cursor-help"
                        title={d.notes}
                      >
                        {d.notes}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditing(d);
                          setModalOpen(true);
                        }}
                        className="text-navy hover:text-gold transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary by Beneficiary */}
      {beneficiarySummary.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-navy text-white px-4 py-3">
            <h3 className="font-bold">Por Beneficiario</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy/10">
                  <th className="px-4 py-3 text-left text-navy font-bold">Beneficiario</th>
                  <th className="px-4 py-3 text-center text-navy font-bold">Nº Donaciones</th>
                  <th className="px-4 py-3 text-right text-navy font-bold">Total Donado</th>
                  <th className="px-4 py-3 text-right text-navy font-bold">% del Total</th>
                </tr>
              </thead>
              <tbody>
                {beneficiarySummary.map((b, i) => (
                  <tr
                    key={b.name}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-cream/50"}`}
                  >
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-center">{b.count}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(b.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gold h-2 rounded-full"
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <span className="w-14 text-right">{b.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DonationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        editingDonation={editing}
      />

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        donations={donations}
      />

    </div>
  );
}
