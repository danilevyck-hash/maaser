"use client";

import { useState, useEffect } from "react";
import { PersonalExpense, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/supabase";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<PersonalExpense>) => void;
  editingExpense: PersonalExpense | null;
};

export default function PersonalExpenseModal({ isOpen, onClose, onSave, editingExpense }: Props) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setSubcategory(editingExpense.subcategory || "");
      setPaymentMethod(editingExpense.payment_method);
    } else {
      setDate(new Date().toISOString().split("T")[0]);
      setAmount("");
      setCategory(EXPENSE_CATEGORIES[0]);
      setSubcategory("");
      setPaymentMethod(PAYMENT_METHODS[0]);
    }
  }, [editingExpense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expense: Partial<PersonalExpense> = {
      date,
      amount: parseFloat(amount) || 0,
      category,
      subcategory: subcategory.trim() || undefined,
      payment_method: paymentMethod,
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none bg-white"
              required
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Subcategoría</label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder="Ej: gasolina, luz, Netflix..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Método de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none bg-white"
              required
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gold hover:bg-yellow-600 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              {editingExpense ? "Guardar Cambios" : "Agregar"}
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
