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
    if (editingExpense) {
      setDate(editingExpense.date);
      setAmount(editingExpense.amount.toString());
      setNotes(editingExpense.notes || "");
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setAmount("");
      setNotes("");
    }
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
    const expense: Partial<Expense> = {
      date,
      amount: parsed,
      notes: notes.trim() || undefined,
    };
    if (editingExpense) {
      expense.id = editingExpense.id;
    }
    onSave(expense);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-navy text-white p-4 rounded-t-xl">
          <h2 className="text-lg font-bold">
            {editingExpense ? "Editar Gasto" : "Nuevo Gasto"}
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
            <label className="block text-sm font-medium text-navy mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none ${amountError ? "border-red-400" : "border-gray-300"}`}
              placeholder="0.00"
              required
            />
            {amountError && <p className="text-red-500 text-xs mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none resize-none"
              placeholder="Descripción del gasto..."
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gold hover:bg-yellow-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : editingExpense ? "Guardar Cambios" : "Agregar"}
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
