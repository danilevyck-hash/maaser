"use client";

import { useState, useEffect, useCallback } from "react";
import { FinanceCategory, FinanceBudget, FinanceRecurring, PAYMENT_METHODS } from "@/lib/supabase";
import { DEFAULT_CATEGORIES } from "@/lib/finance-categories";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/format";

export default function FinanzasConfig() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState(true);

  // Budget modal state
  const [bulkBudgetOpen, setBulkBudgetOpen] = useState(false);
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>({});
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Recurring state
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringItems, setRecurringItems] = useState<FinanceRecurring[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recAmount, setRecAmount] = useState("");
  const [recCategory, setRecCategory] = useState("");
  const [recNotes, setRecNotes] = useState("");
  const [recPaymentMethod, setRecPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [recDayOfMonth, setRecDayOfMonth] = useState("1");
  const [recSaving, setRecSaving] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    const stored = localStorage.getItem("maaser_finance_prefs");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p.budgetAlerts !== undefined) setBudgetAlerts(p.budgetAlerts);
      } catch { /* localStorage parse error, ignore */ }
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/finanzas/categories");
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setCategories(data); }
    } catch {
      showToast("Error al cargar categorias", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch(`/api/finanzas/budgets?month=${currentMonth}`);
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setBudgets(data); }
    } catch {
      showToast("Error al cargar presupuestos", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  useEffect(() => { fetchCategories(); fetchBudgets(); }, [fetchCategories, fetchBudgets]);

  const enabledNames = categories.map((c) => c.name);

  const handleToggleCategory = async (catName: string, isEnabled: boolean) => {
    try {
      const res = await fetch("/api/finanzas/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, enabled: !isEnabled }),
      });
      if (res.ok) {
        fetchCategories();
        showToast(isEnabled ? "Categoria desactivada" : "Categoria activada");
      }
    } catch {
      showToast("Error de conexion", "error");
    }
  };

  // Budget modal helpers
  const openBulkBudget = () => {
    const initial: Record<string, string> = {};
    categories.forEach((cat) => {
      const existing = budgets.find((b) => b.category === cat.name);
      initial[cat.name] = existing ? existing.budget_amount.toString() : "";
    });
    setBudgetAmounts(initial);
    setBulkBudgetOpen(true);
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetSaving(true);
    try {
      const entries = Object.entries(budgetAmounts).filter(([, val]) => val.trim() !== "");
      let errorCount = 0;
      for (const [category, val] of entries) {
        const budget_amount = parseFloat(val);
        if (isNaN(budget_amount) || budget_amount < 0) continue;
        const res = await fetch("/api/finanzas/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, budget_amount, month: currentMonth }),
        });
        if (!res.ok) errorCount++;
      }
      if (errorCount > 0) {
        showToast(`${errorCount} presupuesto(s) no se pudieron guardar`, "error");
      } else {
        showToast("Presupuestos guardados");
      }
      fetchBudgets();
      setBulkBudgetOpen(false);
    } catch {
      showToast("Error de conexion", "error");
    } finally {
      setBudgetSaving(false);
    }
  };

  // Recurring helpers
  const fetchRecurring = async () => {
    setRecurringLoading(true);
    try {
      const res = await fetch("/api/finanzas/recurring");
      if (res.ok) { const data = await res.json(); setRecurringItems(data); }
    } catch {
      showToast("Error al cargar recurrentes", "error");
    } finally {
      setRecurringLoading(false);
    }
  };

  const openRecurring = () => {
    setRecurringOpen(true);
    fetchRecurring();
    setShowRecurringForm(false);
    resetRecurringForm();
  };

  const resetRecurringForm = () => {
    setRecAmount("");
    setRecCategory(categories.length > 0 ? categories[0].name : "");
    setRecNotes("");
    setRecPaymentMethod(PAYMENT_METHODS[0]);
    setRecDayOfMonth("1");
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecSaving(true);
    try {
      const res = await fetch("/api/finanzas/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(recAmount) || 0,
          category: recCategory,
          notes: recNotes.trim() || undefined,
          payment_method: recPaymentMethod,
          day_of_month: parseInt(recDayOfMonth) || 1,
        }),
      });
      if (res.ok) {
        showToast("Gasto recurrente agregado");
        setShowRecurringForm(false);
        resetRecurringForm();
        fetchRecurring();
      } else {
        const data = await res.json();
        showToast(data.error || "Error al guardar", "error");
      }
    } catch {
      showToast("Error de conexion", "error");
    } finally {
      setRecSaving(false);
    }
  };

  const handleToggleRecurring = async (item: FinanceRecurring) => {
    try {
      const res = await fetch("/api/finanzas/recurring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
      });
      if (res.ok) {
        setRecurringItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i))
        );
      }
    } catch {
      showToast("Error al actualizar", "error");
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm("¿Eliminar este gasto recurrente?")) return;
    try {
      const res = await fetch("/api/finanzas/recurring", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRecurringItems((prev) => prev.filter((i) => i.id !== id));
        showToast("Gasto recurrente eliminado");
      }
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  const Cell = ({ label, value, onClick, toggle: toggleVal, onToggle }: {
    label: string; value?: string; onClick?: () => void;
    toggle?: boolean; onToggle?: (v: boolean) => void;
  }) => (
    <button
      onClick={() => { if (onToggle) onToggle(!toggleVal); else if (onClick) onClick(); }}
      className={`w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-left bg-transparent border-0 ${onClick || onToggle ? "active:bg-gray-100" : ""}`}
    >
      <span className="text-[15px] text-[#1C1C1E]">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-[15px] text-[#8E8E93]">{value}</span>}
        {toggleVal !== undefined && onToggle && (
          <div className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors ${toggleVal ? "bg-[#34C759]" : "bg-gray-300"}`}>
            <span className={`inline-block h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${toggleVal ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
          </div>
        )}
        {onClick && (
          <svg className="h-4 w-4 text-[#C7C7CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </button>
  );

  const Divider = () => <div className="border-t border-[#C6C6C8]/20 ml-4" />;
  const SectionHeader = ({ children }: { children: string }) => (
    <p className="text-[13px] text-[#8E8E93] uppercase px-4 pt-5 pb-1.5">{children}</p>
  );

  return (
    <div className="px-4 pt-2 pb-8">
      {/* Finanzas settings */}
      <SectionHeader>Finanzas</SectionHeader>
      <div className="bg-white rounded-2xl overflow-hidden">
        <Cell label="Categorias" value={`${categories.length}`} />
        <Divider />
        <Cell label="Presupuestos" value={`${budgets.length} de ${categories.length}`} onClick={openBulkBudget} />
        <Divider />
        <Cell label="Gastos recurrentes" onClick={openRecurring} />
      </div>

      {/* Categories toggle section */}
      <SectionHeader>Categorias</SectionHeader>
      <div className="bg-white rounded-2xl overflow-hidden">
        {DEFAULT_CATEGORIES.map((cat, idx) => {
          const isEnabled = enabledNames.includes(cat.name);
          return (
            <div key={cat.name}>
              {idx > 0 && <Divider />}
              <button
                onClick={() => handleToggleCategory(cat.name, isEnabled)}
                className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-left bg-transparent border-0 active:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[15px] text-[#1C1C1E]">{cat.name}</span>
                </div>
                <div className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors ${isEnabled ? "bg-[#34C759]" : "bg-gray-300"}`}>
                  <span className={`inline-block h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Preferences */}
      <SectionHeader>Preferencias</SectionHeader>
      <div className="bg-white rounded-2xl overflow-hidden">
        <Cell
          label="Alertas de presupuesto"
          toggle={budgetAlerts}
          onToggle={(v) => {
            setBudgetAlerts(v);
            const current = JSON.parse(localStorage.getItem("maaser_finance_prefs") || "{}");
            localStorage.setItem("maaser_finance_prefs", JSON.stringify({ ...current, budgetAlerts: v }));
            showToast(v ? "Alertas activadas" : "Alertas desactivadas");
          }}
        />
      </div>

      {/* Footer */}
      <div className="text-center space-y-1 py-6">
        <p className="text-[13px] text-[#8E8E93]">{categories.length} categorias · {budgets.length} presupuestos</p>
      </div>

      {/* Bulk Budget Modal */}
      {bulkBudgetOpen && (
        <div className="fixed inset-0 bg-[#F2F2F7] z-[110] animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <form
            onSubmit={handleBudgetSubmit}
            className="flex flex-col h-full"
          >
            <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-[#C6C6C8] shrink-0 bg-white">
              <button type="button" onClick={() => setBulkBudgetOpen(false)} className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px]">Cancelar</button>
              <h2 className="text-[17px] font-semibold text-[#1C1C1E]">Presupuestos</h2>
              <button type="submit" disabled={budgetSaving} className="text-[#007AFF] text-[15px] font-bold bg-transparent border-0 cursor-pointer disabled:opacity-50 min-h-[44px]">
                {budgetSaving ? "..." : "Guardar"}
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: "touch" }}>
              <p className="text-sm text-[#8E8E93] mb-2">
                Presupuesto de cada categoria para <span className="font-semibold text-[#1C1C1E]">{currentMonth}</span>
              </p>
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-[#1C1C1E] flex-1 truncate">{cat.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={budgetAmounts[cat.name] || ""}
                    onChange={(e) => setBudgetAmounts((prev) => ({ ...prev, [cat.name]: e.target.value }))}
                    className="w-28 border border-[#C6C6C8] rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#007AFF] outline-none text-sm bg-white text-[#1C1C1E] text-right"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* Recurring Expenses Modal */}
      {recurringOpen && (
        <div className="fixed inset-0 bg-[#F2F2F7] z-[110] animate-slide-up" onClick={(e) => e.stopPropagation()}>
          <div
            className="flex flex-col h-full"
          >
            <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-[#C6C6C8] shrink-0 bg-white">
              <div className="min-w-[70px]" />
              <h2 className="text-[17px] font-semibold text-[#1C1C1E]">Gastos Recurrentes</h2>
              <button onClick={() => setRecurringOpen(false)} className="text-[#007AFF] text-[15px] font-bold bg-transparent border-0 cursor-pointer min-h-[44px]">Listo</button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: "touch" }}>
              {recurringLoading ? (
                <p className="text-center text-[#8E8E93] py-4">Cargando...</p>
              ) : recurringItems.length === 0 && !showRecurringForm ? (
                <p className="text-center text-[#8E8E93] py-4">No hay gastos recurrentes</p>
              ) : (
                <div className="space-y-3">
                  {recurringItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        item.is_active ? "border-[#C6C6C8]/30 bg-white" : "border-[#C6C6C8]/20 bg-[#F2F2F7] opacity-60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1C1C1E]">{formatCurrency(item.amount)}</span>
                          <span className="text-xs text-[#8E8E93]">dia {item.day_of_month}</span>
                        </div>
                        <div className="text-sm text-[#8E8E93] truncate">
                          {item.category} · {item.payment_method}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-[#8E8E93] truncate">{item.notes}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleRecurring(item)}
                        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors bg-transparent border-0 ${
                          item.is_active ? "text-[#007AFF]" : "text-gray-300"
                        }`}
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {item.is_active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRecurring(item.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 transition-colors bg-transparent border-0"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showRecurringForm ? (
                <form onSubmit={handleAddRecurring} className="space-y-3 border-t border-[#C6C6C8]/30 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Monto ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={recAmount}
                        onChange={(e) => setRecAmount(e.target.value)}
                        className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Dia del mes</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={recDayOfMonth}
                        onChange={(e) => setRecDayOfMonth(e.target.value)}
                        className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Categoria</label>
                    <select
                      value={recCategory}
                      onChange={(e) => setRecCategory(e.target.value)}
                      className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none bg-white text-[#1C1C1E] text-[16px]"
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Metodo de Pago</label>
                    <select
                      value={recPaymentMethod}
                      onChange={(e) => setRecPaymentMethod(e.target.value)}
                      className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none bg-white text-[#1C1C1E] text-[16px]"
                      required
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Notas</label>
                    <input
                      type="text"
                      value={recNotes}
                      onChange={(e) => setRecNotes(e.target.value)}
                      className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
                      placeholder="Descripcion..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={recSaving}
                      className="flex-1 bg-[#007AFF] disabled:opacity-50 text-white font-semibold py-3 rounded-xl min-h-[48px] text-[16px] border-0"
                    >
                      {recSaving ? "Guardando..." : "Agregar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowRecurringForm(false); resetRecurringForm(); }}
                      className="flex-1 bg-[#E5E5EA] text-[#1C1C1E] font-semibold py-3 rounded-xl min-h-[48px] text-[16px] border-0"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => { setShowRecurringForm(true); setRecCategory(categories.length > 0 ? categories[0].name : ""); }}
                  className="w-full bg-[#007AFF] text-white font-semibold py-3 rounded-xl min-h-[48px] text-[16px] border-0"
                >
                  + Agregar gasto recurrente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
