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
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

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
    if (editingDonation) donation.id = editingDonation.id;
    onSave(donation);
  };

  const inputClass = "w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none bg-white";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl shadow-sm w-full max-w-[430px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#C6C6C8]">
          <button type="button" onClick={onClose} className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer">
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">
            {editingDonation ? "Editar Donacion" : "Nueva Donacion"}
          </h2>
          <div className="w-16" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">No. Cheque</label>
              <input
                type="text" inputMode="numeric" maxLength={4}
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputClass} placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Beneficiario</label>
            <input type="text" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={inputClass} placeholder="Nombre del beneficiario" required />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Monto ($)</label>
            <input
              type="number" step="0.01" min="0.01" value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
              className={`${inputClass} ${amountError ? "!border-[#FF3B30] ring-2 ring-[#FF3B30]/20" : ""}`}
              placeholder="100.00" required
            />
            {amountError && <p className="text-[#FF3B30] text-[13px] mt-1 font-medium">{amountError}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} placeholder="Opcional..." rows={2} />
          </div>
          <button
            type="submit" disabled={saving}
            className="w-full h-12 rounded-xl bg-[#007AFF] text-white font-semibold text-[17px] border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : editingDonation ? "Guardar Cambios" : "Agregar"}
          </button>
        </form>
      </div>
    </div>
  );
}
