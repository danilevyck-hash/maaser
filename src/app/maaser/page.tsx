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
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);


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
      // API error — show empty state
    } finally {
      setLoading(false);
    }
  }, [yearData.startDate, yearData.endDate]);

  const fetchGoal = useCallback(async () => {
    try {
      const res = await fetch(`/api/goal?year=${hebrewYear}`);
      if (res.ok) {
        const data = await res.json();
        setGoalAmount(data.goal_amount || 0);
        setGoalInput((data.goal_amount || 0).toString());
      }
    } catch {
      // Goal fetch failed silently
    }
  }, [hebrewYear]);

  useEffect(() => {
    fetchDonations();
    fetchGoal();
  }, [fetchDonations, fetchGoal]);

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const donationCount = donations.length;
  const goalProgress = goalAmount > 0 ? Math.min((totalDonated / goalAmount) * 100, 100) : 0;
  const remaining = goalAmount > 0 ? Math.max(goalAmount - totalDonated, 0) : 0;


  const handleSave = async (donation: Partial<Donation>) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/donations", {
        method: donation.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donation),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setErrorMsg(err?.error || "Error al guardar la donación");
        return;
      }
      setModalOpen(false);
      setEditing(null);
      fetchDonations();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/donations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      setErrorMsg(err?.error || "Error al eliminar la donación");
    }
    setConfirmingDeleteId(null);
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
        <div className="text-navy text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl flex items-center justify-between">
          <span className="text-base">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600 font-bold ml-3 text-xl">&times;</button>
        </div>
      )}

      {/* Hebrew Year Header */}
      <div className="text-center">
        <p className="text-gold font-semibold text-base tracking-wide">
          Año Hebreo {hebrewYear}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gold">
          <p className="text-base text-gray-500 uppercase tracking-wide">Total Donado</p>
          <p className="text-3xl font-bold text-navy mt-2">{formatCurrency(totalDonated)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-navy">
          <p className="text-base text-gray-500 uppercase tracking-wide">Nº Donaciones</p>
          <p className="text-3xl font-bold text-navy mt-2">{donationCount}</p>
        </div>
      </div>

      {/* Annual Goal */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy text-xl">Meta Anual {hebrewYear}</h3>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <span className="text-base text-gray-500">$</span>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-36 text-base focus:ring-2 focus:ring-gold outline-none"
              />
              <button
                onClick={saveGoal}
                className="bg-gold text-white text-base px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingGoal(false)}
                className="text-gray-500 text-base px-3 py-2 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              className="text-gold hover:text-yellow-600 text-base font-semibold"
            >
              {goalAmount > 0 ? `Meta: ${formatCurrency(goalAmount)} — Editar` : "Establecer meta"}
            </button>
          )}
        </div>
        {goalAmount > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-gold to-yellow-500 h-5 rounded-full transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-base mt-2 text-gray-600">
              <span>{goalProgress.toFixed(1)}% completado</span>
              <span>Falta: {formatCurrency(remaining)}</span>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
        <button
          onClick={() => setExportOpen(true)}
          className="bg-white border-2 border-navy text-navy hover:bg-navy hover:text-white font-bold px-6 py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-base"
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
          className="bg-gold hover:bg-yellow-600 text-white font-bold px-6 py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-lg"
        >
          <span className="text-2xl leading-none">+</span> Nueva Donación
        </button>
      </div>

      {/* Donations Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-4 py-4 text-left font-semibold">#</th>
                <th className="px-4 py-4 text-left font-semibold">Fecha</th>
                <th className="px-4 py-4 text-center font-semibold">Cheque</th>
                <th className="px-4 py-4 text-left font-semibold">Beneficiario</th>
                <th className="px-4 py-4 text-right font-semibold">Monto</th>
                <th className="px-4 py-4 text-left font-semibold">Notas</th>
                <th className="px-4 py-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 text-xl mb-2">No hay donaciones registradas</p>
                    <p className="text-gray-400 text-base">Haz clic en <strong className="text-gold">+ Nueva Donación</strong> para comenzar.</p>
                  </td>
                </tr>
              ) : null}
              {donations.map((d, i) => (
                <tr
                  key={d.id}
                  className={`border-b border-gray-200 ${
                    i % 2 === 0 ? "bg-white" : "bg-cream"
                  }`}
                >
                  <td className="px-4 py-4 font-medium text-gray-500">{donations.length - i}</td>
                  <td className="px-4 py-4">{formatDate(d.date)}</td>
                  <td className="px-4 py-4 text-center font-mono">{d.check_number || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-4 font-medium">{d.beneficiary}</td>
                  <td className="px-4 py-4 text-right text-lg font-bold text-navy">{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-4 max-w-[200px]">
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
                  <td className="px-4 py-4 text-center">
                    {confirmingDeleteId === d.id ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-red-600 font-medium whitespace-nowrap">¿Eliminar esta donación?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditing(d);
                            setModalOpen(true);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-1.5 border border-emerald-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(d.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-1.5 border border-red-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <DonationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        editingDonation={editing}
        saving={saving}
      />

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        donations={donations}
      />

    </div>
  );
}
