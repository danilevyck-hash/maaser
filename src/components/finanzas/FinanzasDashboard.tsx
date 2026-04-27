"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FinanceExpense, FinanceCategory, FinanceBudget } from "@/lib/supabase";
import { formatCurrency, formatDate, todayLocalISO, MONTH_NAMES } from "@/lib/format";
import { useToast } from "@/components/Toast";
import ExpenseModal from "./ExpenseModal";
import CategoryExpensesModal from "./CategoryExpensesModal";
import React from "react";

export default function FinanzasDashboard() {
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceExpense | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const [fabVisible, setFabVisible] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const [lastCategory, setLastCategory] = useState<string>("");
  const [lastPaymentMethod, setLastPaymentMethod] = useState<string>("");

  const viewMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const dateFrom = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dateTo = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/finanzas/categories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCategories(data);
      }
    } catch {
      showToast("Error de conexion", "error");
    }
  }, [showToast]);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch(`/api/finanzas/budgets?month=${viewMonthStr}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBudgets(data);
      }
    } catch {
      showToast("Error de conexion", "error");
    }
  }, [viewMonthStr, showToast]);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/finanzas/expenses?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setExpenses(data);
      }
    } catch {
      showToast("Error de conexion", "error");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, showToast]);

  useEffect(() => { setLoading(true); fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const recurringApplied = useRef(false);
  useEffect(() => {
    if (!isCurrentMonth || recurringApplied.current) return;
    recurringApplied.current = true;
    (async () => {
      try {
        const res = await fetch("/api/finanzas/recurring/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: viewMonthStr }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.created > 0) {
            await fetchExpenses();
            showToast(`Se aplicaron ${data.created} gasto(s) recurrente(s)`);
          }
        }
      } catch {
        showToast("Error al aplicar recurrentes", "error");
      }
    })();
  }, [isCurrentMonth, viewMonthStr, fetchExpenses, showToast]);

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  // All expenses for trend comparison
  const [allExpenses, setAllExpenses] = useState<FinanceExpense[]>([]);
  const fetchAllExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/finanzas/expenses`);
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setAllExpenses(data); }
    } catch {
      showToast("Error de conexion", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { fetchAllExpenses(); }, [fetchAllExpenses]);

  const handleSave = async (expense: Partial<FinanceExpense>) => {
    setSaving(true);
    try {
      const method = expense.id ? "PUT" : "POST";
      const res = await fetch("/api/finanzas/expenses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Error al guardar", "error");
        return;
      }
      setModalOpen(false);
      setEditing(null);
      showToast(expense.id ? "Gasto actualizado" : "Gasto agregado");
      if (expense.category) setLastCategory(expense.category);
      if (expense.payment_method) setLastPaymentMethod(expense.payment_method);

      // Budget alert
      if (expense.category && expense.date) {
        const expenseMonth = expense.date.substring(0, 7);
        if (expenseMonth === viewMonthStr) {
          const budget = budgetMap[expense.category];
          if (budget && budget > 0) {
            const currentTotal = expenses
              .filter((e) => e.category === expense.category)
              .reduce((sum, e) => sum + e.amount, 0);
            const newTotal = expense.id
              ? currentTotal - (editing?.amount || 0) + (expense.amount || 0)
              : currentTotal + (expense.amount || 0);
            const pct = (newTotal / budget) * 100;
            if (pct >= 100) {
              showToast(`${expense.category}: Presupuesto agotado`, "error");
            } else if (pct >= 80) {
              showToast(`${expense.category}: ${Math.round(pct)}% del presupuesto`);
            }
          }
        }
      }
      fetchExpenses();
      fetchAllExpenses();
    } catch {
      showToast("Error de conexion", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      const res = await fetch("/api/finanzas/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        showToast("Error al eliminar", "error");
        return;
      }
      showToast("Gasto eliminado");
      fetchExpenses();
      fetchAllExpenses();
    } catch {
      showToast("Error de conexion", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (expense: FinanceExpense) => {
    const today = todayLocalISO();
    const dup = {
      date: today,
      amount: expense.amount,
      category: expense.category,
      notes: expense.notes,
      payment_method: expense.payment_method,
    };
    try {
      const res = await fetch("/api/finanzas/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dup),
      });
      if (res.ok) {
        showToast("Gasto duplicado");
        fetchExpenses();
        fetchAllExpenses();
      } else {
        showToast("Error al duplicar", "error");
      }
    } catch {
      showToast("Error de conexion", "error");
    }
  };

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.name] = c.color; });
    return map;
  }, [categories]);

  const iconMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { if (c.icon) map[c.name] = c.icon; });
    return map;
  }, [categories]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .map(([name, total]) => ({
        name, total,
        pct: totalMonth > 0 ? (total / totalMonth) * 100 : 0,
        color: colorMap[name] || "#6B7280",
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalMonth, colorMap]);

  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach((b) => { map[b.category] = b.budget_amount; });
    return map;
  }, [budgets]);

  const sortedCategoryData = useMemo(() => {
    const withBudget = categoryData
      .filter((cat) => budgetMap[cat.name] != null && budgetMap[cat.name] > 0)
      .sort((a, b) => {
        const pctA = (a.total / budgetMap[a.name]) * 100;
        const pctB = (b.total / budgetMap[b.name]) * 100;
        return pctB - pctA;
      });
    const withoutBudget = categoryData.filter((cat) => !budgetMap[cat.name] || budgetMap[cat.name] <= 0);
    return [...withBudget, ...withoutBudget];
  }, [categoryData, budgetMap]);

  // Budget KPIs
  const budgetTotal = useMemo(() => budgets.reduce((sum, b) => sum + b.budget_amount, 0), [budgets]);
  const hasBudgets = budgets.length > 0 && budgetTotal > 0;
  const daysInMonth = lastDay;
  const daysPassed = isCurrentMonth ? now.getDate() : lastDay;
  const spentPct = budgetTotal > 0 ? (totalMonth / budgetTotal) * 100 : 0;
  const available = budgetTotal - totalMonth;

  // Projection
  const dailyAvg = daysPassed > 0 ? totalMonth / daysPassed : 0;
  const projected = dailyAvg * daysInMonth;

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const method = e.payment_method || "Otro";
      map[method] = (map[method] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Trends vs previous month
  const prevMonthData = useMemo(() => {
    let pm = viewMonth - 1;
    let py = viewYear;
    if (pm < 0) { pm = 11; py--; }
    const prefix = `${py}-${String(pm + 1).padStart(2, "0")}`;
    const prevExpenses = allExpenses.filter((e) => e.date.startsWith(prefix));

    const currentDay = isCurrentMonth ? now.getDate() : lastDay;
    const prevSamePeriod = prevExpenses.filter((e) => {
      const day = parseInt(e.date.split("-")[2], 10);
      return day <= currentDay;
    });

    const prevTotal = prevSamePeriod.reduce((sum, e) => sum + e.amount, 0);
    return { total: prevTotal, hasData: prevExpenses.length > 0 };
  }, [allExpenses, viewMonth, viewYear, isCurrentMonth, now, lastDay]);

  // FAB hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setFabVisible(currentY < lastScrollY.current || currentY < 100);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter((e) =>
      (e.notes && e.notes.toLowerCase().includes(q)) ||
      e.category.toLowerCase().includes(q) ||
      e.payment_method.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, FinanceExpense[]> = {};
    filteredExpenses.forEach((e) => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items,
        total: items.reduce((sum, e) => sum + e.amount, 0),
      }));
  }, [filteredExpenses]);

  const allFilteredExpenses = useMemo(() => groupedExpenses.flatMap(g => g.items), [groupedExpenses]);
  const visibleExpenses = useMemo(() => allFilteredExpenses.slice(0, visibleCount), [allFilteredExpenses, visibleCount]);
  const hasMore = allFilteredExpenses.length > visibleCount;

  const visibleGroups = useMemo(() => {
    const groups: Record<string, FinanceExpense[]> = {};
    visibleExpenses.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => ({
      date, items, total: items.reduce((sum, e) => sum + e.amount, 0)
    }));
  }, [visibleExpenses]);

  const navigateMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setVisibleCount(15);
    setViewMonth(m);
    setViewYear(y);
  };

  const todayStr = todayLocalISO();
  const daysRemaining = isCurrentMonth ? Math.max(daysInMonth - now.getDate(), 0) : 0;

  return (
    <>
      <div className="space-y-4 px-4 pt-4">
        {/* Month navigation */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-transparent border-0"
          >
            <svg className="h-5 w-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center min-w-[180px]">
            <h2 className="text-xl font-semibold text-[#1C1C1E] flex items-center justify-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
              {isCurrentMonth && <span className="inline-block w-2 h-2 bg-[#007AFF] rounded-full ml-1.5 animate-pulse" />}
            </h2>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-transparent border-0"
          >
            <svg className="h-5 w-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#8E8E93] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 text-center">
              <p className={`text-[34px] font-bold leading-tight tabular-nums ${hasBudgets && spentPct >= 100 ? "text-red-500" : hasBudgets && spentPct >= 80 ? "text-amber-500" : "text-[#1C1C1E]"}`}>
                {formatCurrency(totalMonth)}
              </p>
              <p className="text-[13px] text-[#8E8E93] mt-1">
                {hasBudgets
                  ? `de ${formatCurrency(budgetTotal)} · quedan ${formatCurrency(Math.max(available, 0))}`
                  : `${expenses.length} gasto${expenses.length !== 1 ? "s" : ""}`
                }
              </p>
            </div>

            {/* Mini KPIs row */}
            {(prevMonthData.hasData || (isCurrentMonth && daysPassed > 0 && expenses.length > 0)) && (
              <div className="border-t border-[#C6C6C8]/20 grid grid-cols-2 divide-x divide-[#C6C6C8]/20">
                {prevMonthData.hasData && prevMonthData.total > 0 ? (() => {
                  const diff = totalMonth - prevMonthData.total;
                  const changePct = (diff / prevMonthData.total) * 100;
                  const isMore = diff > 0;
                  return (
                    <div className="px-4 py-3 text-center">
                      <p className="text-[11px] text-[#8E8E93] uppercase">vs mes anterior</p>
                      <p className={`text-[17px] font-semibold mt-0.5 tabular-nums ${isMore ? "text-red-500" : "text-green-500"}`}>
                        {isMore ? "+" : ""}{Math.round(changePct)}%
                      </p>
                      <p className="text-[11px] text-[#8E8E93]">al dia {daysPassed}</p>
                    </div>
                  );
                })() : (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[11px] text-[#8E8E93] uppercase">vs mes anterior</p>
                    <p className="text-[15px] text-[#8E8E93] mt-0.5">--</p>
                  </div>
                )}

                {isCurrentMonth && daysPassed > 0 && expenses.length > 0 ? (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[11px] text-[#8E8E93] uppercase">Proyeccion</p>
                    <p className={`text-[17px] font-semibold mt-0.5 tabular-nums ${hasBudgets && projected > budgetTotal ? "text-red-500" : "text-[#1C1C1E]"}`}>
                      {formatCurrency(projected)}
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">fin de mes</p>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[11px] text-[#8E8E93] uppercase">Dias restantes</p>
                    <p className="text-[17px] font-semibold mt-0.5 tabular-nums text-[#1C1C1E]">
                      {daysRemaining}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Category breakdown */}
        {!loading && categoryData.length > 0 && (
          <div>
            <p className="text-[13px] font-medium text-[#8E8E93] uppercase px-1 mb-2">Por Categoria</p>
            <div className="bg-white rounded-2xl px-4">
              {sortedCategoryData.map((cat, idx) => {
                const budget = budgetMap[cat.name];
                const hasBudget = budget != null && budget > 0;
                const budgetPct = hasBudget ? (cat.total / budget) * 100 : 0;
                const budgetBarColor = budgetPct >= 100 ? "#ef4444" : budgetPct >= 80 ? "#f59e0b" : "#007AFF";
                const remaining = hasBudget ? budget - cat.total : 0;

                return (
                  <div key={cat.name} className={idx > 0 ? "border-t border-[#C6C6C8]/20 ml-6 -mx-0" : ""}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`w-full text-left active:bg-[#E5E5EA]/40 transition-colors ${idx > 0 ? "-ml-6 pl-6" : ""}`}
                    >
                      <div className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-[15px] text-[#1C1C1E]">{iconMap[cat.name] || ""} {cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] tabular-nums text-[#1C1C1E]">{formatCurrency(cat.total)}</span>
                          <svg className="h-3.5 w-3.5 text-[#C7C7CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {hasBudget && (
                        <div className="pb-2 pr-5">
                          <div className="w-full bg-[#E5E5EA] rounded-full h-1.5 overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: budgetBarColor }} />
                          </div>
                          <p className="text-[11px] text-[#8E8E93]">
                            {formatCurrency(cat.total)} de {formatCurrency(budget)} -- {budgetPct >= 100 ? "por encima" : `quedan ${formatCurrency(remaining)}`}
                          </p>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment method breakdown */}
        {!loading && paymentMethodData.length > 1 && (
          <div>
            <p className="text-[13px] font-medium text-[#8E8E93] uppercase px-1 mb-2">Por Metodo de Pago</p>
            <div className="bg-white rounded-2xl px-4">
              {paymentMethodData.map((pm, idx) => (
                <div key={pm.method} className={idx > 0 ? "border-t border-[#C6C6C8]/20" : ""}>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[15px] text-[#1C1C1E]">{pm.method}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] tabular-nums text-[#1C1C1E]">{formatCurrency(pm.total)}</span>
                      <span className="text-[11px] text-[#8E8E93] w-8 text-right">{totalMonth > 0 ? `${Math.round((pm.total / totalMonth) * 100)}%` : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense list header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase">Gastos</p>
          <button onClick={() => setShowSearch(!showSearch)} className="text-[15px] text-[#007AFF] bg-transparent border-0">
            {showSearch ? "Cerrar" : "Buscar"}
          </button>
        </div>

        {/* Expense list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#8E8E93] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#E5E5EA] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <p className="text-[15px] text-[#8E8E93]">Sin gastos este mes</p>
              <button
                onClick={() => { setEditing(null); setModalOpen(true); }}
                className="text-[15px] text-[#007AFF] font-medium mt-2 bg-transparent border-0"
              >
                Agregar primer gasto
              </button>
            </div>
          ) : (
            <>
              {showSearch && (
                <div className="px-1 pb-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar gastos..."
                    className="w-full bg-[#E5E5EA] rounded-xl px-4 py-2 text-[16px] text-[#1C1C1E] placeholder:text-[#8E8E93] outline-none"
                  />
                </div>
              )}

              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[15px] text-[#8E8E93]">Sin resultados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleGroups.map((group) => (
                    <div key={group.date}>
                      <p className="text-[13px] font-medium text-[#8E8E93] uppercase px-1 mb-1.5">
                        {group.date === todayStr ? "Hoy" : formatDate(group.date)} · {formatCurrency(group.total)}
                      </p>
                      <div className="bg-white rounded-2xl overflow-hidden">
                        {group.items.map((e, i) => (
                          <React.Fragment key={e.id}>
                            {i > 0 && <div className="border-t border-[#C6C6C8]/30 ml-14" />}
                            <div
                              className={`flex items-center py-3 px-4 active:bg-[#E5E5EA]/50 transition-colors cursor-pointer ${deletingId === e.id ? "opacity-50" : ""}`}
                              onClick={() => { setEditing(e); setModalOpen(true); }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] text-[#1C1C1E]">{iconMap[e.category] || ""} {e.category}</p>
                                {e.notes && <p className="text-[13px] text-[#8E8E93] truncate">{e.notes}</p>}
                              </div>
                              <div className="text-right flex-shrink-0 ml-3">
                                <p className="text-[15px] font-semibold text-[#1C1C1E] tabular-nums">{formatCurrency(e.amount)}</p>
                                <p className="text-[11px] text-[#8E8E93]">{e.payment_method}</p>
                              </div>
                              <button
                                onClick={(ev) => { ev.stopPropagation(); handleDuplicate(e); }}
                                className="ml-1 p-1 text-[#C7C7CC] hover:text-[#007AFF] transition-colors flex-shrink-0 bg-transparent border-0"
                                title="Duplicar"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <svg className="h-4 w-4 text-[#C7C7CC] ml-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount(v => v + 15)}
                      className="w-full py-3 text-[15px] text-[#007AFF] font-medium bg-transparent border-0"
                    >
                      Ver mas ({allFilteredExpenses.length - visibleCount} restantes)
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId !== null && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h3 className="text-[17px] font-semibold text-[#1C1C1E]">Eliminar gasto</h3>
              <p className="text-[13px] text-[#8E8E93] mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="border-t border-[#C6C6C8]/30">
              <button onClick={handleDeleteConfirm}
                className="w-full py-3 text-[17px] text-red-500 font-medium border-b border-[#C6C6C8]/30 bg-transparent min-h-[44px]">
                Eliminar
              </button>
              <button onClick={() => setConfirmDeleteId(null)}
                className="w-full py-3 text-[17px] text-[#007AFF] font-semibold bg-transparent border-0 min-h-[44px]">
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editingExpense={editing}
        categories={categories}
        saving={saving}
        defaultCategory={lastCategory}
        defaultPaymentMethod={lastPaymentMethod}
      />

      <CategoryExpensesModal
        isOpen={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
        category={selectedCategory || ""}
        expenses={expenses}
        iconMap={iconMap}
        colorMap={colorMap}
        todayStr={todayStr}
        onSelectExpense={(e) => {
          setSelectedCategory(null);
          setEditing(e);
          setModalOpen(true);
        }}
      />

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setModalOpen(true); }}
        className={`fixed bottom-24 right-5 z-40 w-14 h-14 bg-[#007AFF] text-white rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 border-0 ${fabVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}`}
        style={{ boxShadow: "0 4px 16px rgba(0,122,255,0.4)" }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}
