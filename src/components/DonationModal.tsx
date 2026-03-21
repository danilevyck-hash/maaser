"use client";

import { useState, useEffect } from "react";
import { Donation } from "@/lib/supabase";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (donation: Partial<Donation>) => void;
  editingDonation: Donation | null;
};

export default function DonationModal({ isOpen, onClose, onSave, editingDonation }: Props) {
  const [date, setDate] = useState("");
  const [receiptNumber, setReceiptNumber] = useState(0);
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"valido" | "anulado">("valido");

  useEffect(() => {
    if (editingDonation) {
      setDate(editingDonation.date);
      setReceiptNumber(editingDonation.receipt_number);
      setBeneficiary(editingDonation.beneficiary);
      setAmount(editingDonation.amount.toString());
      setStatus(editingDonation.status);
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setBeneficiary("");
      setAmount("");
      setStatus("valido");
      fetch("/api/donations/next-receipt")
        .then((r) => r.json())
        .then((d) => setReceiptNumber(d.next));
    }
  }, [editingDonation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const donation: Partial<Donation> = {
      date,
      receipt_number: receiptNumber,
      beneficiary,
      amount: parseFloat(amount) || 0,
      status,
    };
    if (editingDonation) {
      donation.id = editingDonation.id;
    }
    onSave(donation);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-navy text-white p-4 rounded-t-xl">
          <h2 className="text-lg font-bold">
            {editingDonation ? "Editar Donación" : "Nueva Donación"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Nº Recibo</label>
            <input
              type="number"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Beneficiario</label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder="Nombre del beneficiario"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Estado</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="valido"
                  checked={status === "valido"}
                  onChange={() => setStatus("valido")}
                  className="accent-gold"
                />
                <span className="text-green-700 font-medium">Válido</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="anulado"
                  checked={status === "anulado"}
                  onChange={() => setStatus("anulado")}
                  className="accent-gold"
                />
                <span className="text-red-600 font-medium">Anulado</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gold hover:bg-yellow-600 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              {editingDonation ? "Guardar Cambios" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
