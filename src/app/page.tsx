"use client";

import { useState, useEffect, useCallback } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import DonationModal from "@/components/DonationModal";

export default function Dashboard() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [goalAmount, setGoalAmount] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  const currentYear = new Date().getFullYear();

  const fetchDonations = useCallback(async () => {
    const res = await fetch(`/api/donations?year=${currentYear}`);
    const data = await res.json();
    setDonations(data);
    setLoading(false);
  }, [currentYear]);

  const fetchGoal = useCallback(async () => {
    const res = await fetch(`/api/goal?year=${currentYear}`);
    const data = await res.json();
    setGoalAmount(data.goal_amount || 0);
    setGoalInput((data.goal_amount || 0).toString());
  }, [currentYear]);

  useEffect(() => {
    fetchDonations();
    fetchGoal();
  }, [fetchDonations, fetchGoal]);

  const validDonations = donations.filter((d) => d.status === "valido");
  const totalDonated = validDonations.reduce((sum, d) => sum + d.amount, 0);
  const validCount = validDonations.length;
  const lastReceipt = donations.length > 0
    ? donations[donations.length - 1].receipt_number
    : "-";
  const goalProgress = goalAmount > 0 ? Math.min((totalDonated / goalAmount) * 100, 100) : 0;
  const remaining = goalAmount > 0 ? Math.max(goalAmount - totalDonated, 0) : 0;

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
      body: JSON.stringify({ year: currentYear, goal_amount: amount }),
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gold">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Total Donado</p>
          <p className="text-2xl font-bold text-navy mt-1">{formatCurrency(totalDonated)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-navy">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Nº Donaciones Válidas</p>
          <p className="text-2xl font-bold text-navy mt-1">{validCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gold">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Último Recibo</p>
          <p className="text-2xl font-bold text-navy mt-1">{lastReceipt}</p>
        </div>
      </div>

      {/* Annual Goal */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy text-lg">Meta Anual {currentYear}</h3>
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

      {/* New Donation Button */}
      <div className="flex justify-end">
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
                <th className="px-4 py-3 text-left">Recibo No.</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Beneficiario</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, i) => (
                <tr
                  key={d.id}
                  className={`border-b border-gray-100 ${
                    d.status === "anulado"
                      ? "bg-red-50 text-red-400 line-through"
                      : i % 2 === 0
                      ? "bg-white"
                      : "bg-cream/50"
                  }`}
                >
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{d.receipt_number}</td>
                  <td className="px-4 py-3">{formatDate(d.date)}</td>
                  <td className="px-4 py-3">{d.beneficiary}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        d.status === "valido"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {d.status === "valido" ? "Válido" : "Anulado"}
                    </span>
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

      <DonationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        editingDonation={editing}
      />
    </div>
  );
}
