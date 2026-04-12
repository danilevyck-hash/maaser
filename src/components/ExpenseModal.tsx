"use client";

import { useState, useEffect } from "react";
import { Expense } from "@/lib/supabase";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<Expense>) => void;
  editingExpense: Expense | null;
  saving?: boolean;
};

export default function ExpenseModal({ isOpen, onClose, onSave, editingExpense, saving }: Props) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date);
      setAmount(editingExpense.amount.toString());
      setNotes(editingExpense.notes || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setAmount("");
      setNotes("");
    }
    setAmountError("");
  }, [editingExpense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setAmountError("El monto debe ser mayor a cero");
      return;
    }
    setAmountError("");
    const expense: Partial<Expense> = { date, amount: parsed, notes: notes.trim() || undefined };
    if (editingExpense) expense.id = editingExpense.id;
    onSave(expense);
  };

  const inputClass = "w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none bg-white";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-2xl shadow-sm w-full max-w-[430px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#C6C6C8]">
          <button type="button" onClick={onClose} className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer">
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">
            {editingExpense ? "Editar Gasto" : "Nuevo Gasto"}
          </h2>
          <div className="w-16" />
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Monto ($)</label>
            <input
              type="text" inputMode="decimal" value={amount}
              onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setAmount(v); setAmountError(""); }}
              className={`${inputClass} ${amountError ? "!border-[#FF3B30] ring-2 ring-[#FF3B30]/20" : ""}`}
              placeholder="Monto" required
            />
            {amountError && <p className="text-[#FF3B30] text-[13px] mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} placeholder="Descripcion del gasto..." rows={2} />
          </div>
          <button
            type="submit" disabled={saving}
            className="w-full h-12 rounded-xl bg-[#007AFF] text-white font-semibold text-[17px] border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : editingExpense ? "Guardar Cambios" : "Agregar"}
          </button>
        </form>
      </div>
    </div>
  );
}
