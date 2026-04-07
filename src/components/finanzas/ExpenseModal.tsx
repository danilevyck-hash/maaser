"use client";

import { useState, useEffect, useRef } from "react";
import { FinanceExpense, FinanceCategory, PAYMENT_METHODS } from "@/lib/supabase";
import { detectCategory } from "@/lib/finance-categories";
import { useToast } from "@/components/Toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<FinanceExpense>) => void;
  editingExpense: FinanceExpense | null;
  categories: FinanceCategory[];
  saving?: boolean;
  defaultCategory?: string;
  defaultPaymentMethod?: string;
};

export default function ExpenseModal({
  isOpen, onClose, onSave, editingExpense, categories, saving,
  defaultCategory, defaultPaymentMethod,
}: Props) {
  const { showToast } = useToast();
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const notesRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [manualCategoryChange, setManualCategoryChange] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
  const dayBeforeDate = new Date();
  dayBeforeDate.setDate(dayBeforeDate.getDate() - 2);
  const dayBeforeStr = dayBeforeDate.toISOString().split("T")[0];

  // Fetch note suggestions when category changes
  useEffect(() => {
    if (!category || !isOpen) {
      setNoteSuggestions([]);
      return;
    }
    fetch(`/api/finanzas/notes-suggestions?category=${encodeURIComponent(category)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (Array.isArray(d)) setNoteSuggestions(d); })
      .catch(() => {});
  }, [category, isOpen]);

  // Auto-detect category from notes (300ms debounce)
  const enabledCategoryNames = categories.map((c) => c.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableEnabledNames = JSON.stringify(enabledCategoryNames);

  useEffect(() => {
    if (!isOpen || manualCategoryChange || !notes) {
      if (!notes && autoDetected) setAutoDetected(false);
      return;
    }
    const timer = setTimeout(() => {
      const parsed = JSON.parse(stableEnabledNames) as string[];
      const detected = detectCategory(notes, parsed);
      if (detected) {
        setCategory(detected);
        setAutoDetected(true);
      } else {
        setAutoDetected(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [notes, stableEnabledNames, isOpen, manualCategoryChange, autoDetected]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        notesRef.current &&
        !notesRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (editingExpense) {
      setDate(editingExpense.date);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setNotes(editingExpense.notes || "");
      setPaymentMethod(editingExpense.payment_method);
    } else {
      setDate(todayStr);
      setAmount("");
      const categoryNames = categories.map((c) => c.name);
      if (defaultCategory && categoryNames.includes(defaultCategory)) {
        setCategory(defaultCategory);
      } else {
        setCategory(categories.length > 0 ? categories[0].name : "");
      }
      setNotes("");
      if (defaultPaymentMethod && (PAYMENT_METHODS as readonly string[]).includes(defaultPaymentMethod)) {
        setPaymentMethod(defaultPaymentMethod);
      } else {
        setPaymentMethod(PAYMENT_METHODS[0]);
      }
    }
    setShowSuggestions(false);
    setAutoDetected(false);
    setManualCategoryChange(false);
    if (editingExpense) {
      setShowDetails(true);
    } else {
      setShowDetails(false);
    }
  }, [editingExpense, isOpen, categories, defaultCategory, defaultPaymentMethod, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast("Ingresa un monto", "error");
      return;
    }
    if (!category) {
      showToast("Selecciona una categoria", "error");
      return;
    }
    if (!date) {
      showToast("Selecciona una fecha", "error");
      return;
    }
    const expense: Partial<FinanceExpense> = {
      date,
      amount: parseFloat(amount) || 0,
      category,
      notes: notes.trim() || undefined,
      payment_method: paymentMethod,
    };
    if (editingExpense) {
      expense.id = editingExpense.id;
    }
    onSave(expense);
  };

  const filteredSuggestions = noteSuggestions.filter(
    (s) => !notes || s.toLowerCase().includes(notes.toLowerCase())
  );

  const dateShortcutClass = (target: string) =>
    `text-xs px-2.5 py-1 rounded-lg transition-colors ${
      date === target
        ? "bg-[#007AFF] text-white"
        : "bg-[#E5E5EA] text-[#8E8E93]"
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#C6C6C8]/30">
          <button type="button" onClick={onClose} className="text-[17px] text-[#007AFF] min-w-[70px] text-left bg-transparent border-0">Cancelar</button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">
            {editingExpense ? "Editar Gasto" : "Nuevo Gasto"}
          </h2>
          <button type="submit" disabled={saving} className="text-[17px] text-[#007AFF] font-semibold min-w-[70px] text-right disabled:opacity-50 bg-transparent border-0">
            {saving ? "..." : "Guardar"}
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="0.00"
              autoFocus
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-[#1C1C1E]">Categoria</label>
              {autoDetected && (
                <span className="text-[11px] font-semibold text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded">Auto</span>
              )}
            </div>
            {categories.length > 0 ? (
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setManualCategoryChange(true); setAutoDetected(false); }}
                className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none bg-white text-[#1C1C1E] text-[16px]"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[#8E8E93] py-3">Activa categorias en Config</p>
            )}
          </div>

          {/* Toggle for more details */}
          <button type="button" onClick={() => setShowDetails(!showDetails)}
            className="w-full py-2 text-[15px] text-[#007AFF] font-medium bg-transparent border-0">
            {showDetails ? "Menos detalles" : "Mas detalles"}
          </button>

          {/* Expandable details section */}
          {showDetails && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Fecha</label>
                <div className="flex gap-2 mb-1.5">
                  <button type="button" onClick={() => setDate(todayStr)} className={dateShortcutClass(todayStr)}>
                    Hoy
                  </button>
                  <button type="button" onClick={() => setDate(yesterdayStr)} className={dateShortcutClass(yesterdayStr)}>
                    Ayer
                  </button>
                  <button type="button" onClick={() => setDate(dayBeforeStr)} className={dateShortcutClass(dayBeforeStr)}>
                    Anteayer
                  </button>
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Notas</label>
                <input
                  ref={notesRef}
                  type="text"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
                  placeholder="Descripcion del gasto..."
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="flex flex-wrap gap-1.5 mt-1.5"
                  >
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setNotes(s); setShowSuggestions(false); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#E5E5EA] text-[#8E8E93] hover:bg-[#007AFF] hover:text-white transition-colors truncate max-w-[200px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Metodo de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none bg-white text-[#1C1C1E] text-[16px]"
                  required
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
