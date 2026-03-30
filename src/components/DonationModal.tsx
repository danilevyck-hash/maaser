"use client";

import { useState, useEffect } from "react";
import { Donation } from "@/lib/supabase";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (donation: Partial<Donation>) => void;
  editingDonation: Donation | null;
  saving?: boolean;
};

export default function DonationModal({ isOpen, onClose, onSave, editingDonation, saving }: Props) {
  const [date, setDate] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (editingDonation) {
      setDate(editingDonation.date);
      setBeneficiary(editingDonation.beneficiary);
      setAmount(editingDonation.amount.toString());
      setCheckNumber(editingDonation.check_number || "");
      setNotes(editingDonation.notes || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setBeneficiary("");
      setAmount("");
      setCheckNumber("");
      setNotes("");
    }
    setAmountError("");
  }, [editingDonation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setAmountError("El monto debe ser mayor a cero");
      return;
    }
    setAmountError("");
    const donation: Partial<Donation> = {
      date,
      beneficiary,
      amount: parsed,
      check_number: checkNumber.trim() || undefined,
      status: "valido",
      notes: notes.trim() || undefined,
    };
    if (editingDonation) {
      donation.id = editingDonation.id;
    }
    onSave(donation);
  };

  const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-gold focus:border-gold outline-none";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-navy text-white p-5 rounded-t-xl">
          <h2 className="text-xl font-bold">
            {editingDonation ? "Editar Donación" : "Nueva Donación"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-navy mb-2">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-navy mb-2">Nº Cheque</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputClass}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold text-navy mb-2">Beneficiario</label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className={inputClass}
              placeholder="Nombre del beneficiario"
              required
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-navy mb-2">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
              className={`${inputClass} ${amountError ? "!border-red-400 ring-2 ring-red-100" : ""}`}
              placeholder="Ejemplo: 100.00"
              required
            />
            {amountError && <p className="text-red-500 text-sm mt-1.5 font-medium">{amountError}</p>}
          </div>
          <div>
            <label className="block text-base font-semibold text-navy mb-2">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Notas opcionales..."
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gold hover:bg-yellow-600 text-white font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {saving ? "Guardando..." : editingDonation ? "Guardar Cambios" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3.5 rounded-lg transition-colors text-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
