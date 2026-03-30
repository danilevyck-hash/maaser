"use client";

import { useState } from "react";
import type { RentProperty, RentContract } from "@/lib/propiedades-types";

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  contracts: RentContract[];
  properties: RentProperty[];
  onRefresh: () => void;
};

type ModalState = { open: boolean; editing: RentContract | null; renewing: RentContract | null };

export default function ContratosTab({ contracts, properties, onRefresh }: Props) {
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null, renewing: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const inOneYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

  const [form, setForm] = useState({
    property_id: "",
    tenant_name: "",
    tenant_phone: "",
    tenant_email: "",
    start_date: today,
    end_date: inOneYear,
    rent_amount: "",
  });

  // Properties without active contract
  const occupiedIds = new Set(contracts.map((c) => c.property_id));
  const availableProps = properties.filter((p) => !occupiedIds.has(p.id));

  function openAdd() {
    setForm({
      property_id: availableProps[0]?.id?.toString() || "",
      tenant_name: "",
      tenant_phone: "",
      tenant_email: "",
      start_date: today,
      end_date: inOneYear,
      rent_amount: availableProps[0]?.rent_amount?.toString() || "",
    });
    setModal({ open: true, editing: null, renewing: null });
  }

  function openEdit(c: RentContract) {
    setForm({
      property_id: String(c.property_id),
      tenant_name: c.tenant_name,
      tenant_phone: c.tenant_phone || "",
      tenant_email: c.tenant_email || "",
      start_date: c.start_date,
      end_date: c.end_date,
      rent_amount: String(c.rent_amount),
    });
    setModal({ open: true, editing: c, renewing: null });
  }

  function openRenew(c: RentContract) {
    const newStart = c.end_date;
    const endDate = new Date(newStart + "T00:00:00");
    endDate.setFullYear(endDate.getFullYear() + 1);
    const newEnd = endDate.toISOString().split("T")[0];

    setForm({
      property_id: String(c.property_id),
      tenant_name: c.tenant_name,
      tenant_phone: c.tenant_phone || "",
      tenant_email: c.tenant_email || "",
      start_date: newStart,
      end_date: newEnd,
      rent_amount: String(c.rent_amount),
    });
    setModal({ open: true, editing: null, renewing: c });
  }

  async function handleSave() {
    if (!form.property_id || !form.tenant_name.trim() || !form.rent_amount) return;
    setSaving(true);

    if (modal.renewing) {
      // Deactivate old contract
      await fetch("/api/propiedades/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modal.renewing.id, active: false }),
      });
    }

    const body = {
      property_id: Number(form.property_id),
      tenant_name: form.tenant_name,
      tenant_phone: form.tenant_phone || null,
      tenant_email: form.tenant_email || null,
      start_date: form.start_date,
      end_date: form.end_date,
      rent_amount: Number(form.rent_amount),
      ...(modal.editing ? { id: modal.editing.id } : {}),
    };

    await fetch("/api/propiedades/contracts", {
      method: modal.editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    setModal({ open: false, editing: null, renewing: null });
    onRefresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este contrato?")) return;
    setDeleting(id);
    await fetch("/api/propiedades/contracts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    onRefresh();
  }

  // Sort: expiring soon first, then by end_date
  const sorted = [...contracts].sort((a, b) => {
    const da = daysUntil(a.end_date);
    const db = daysUntil(b.end_date);
    const aExpiring = da >= 0 && da <= 30;
    const bExpiring = db >= 0 && db <= 30;
    if (aExpiring && !bExpiring) return -1;
    if (!aExpiring && bExpiring) return 1;
    return da - db;
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3.5">
        <div className="text-[13px] font-semibold text-gray-800">{contracts.length} contratos activos</div>
        <button
          onClick={openAdd}
          disabled={availableProps.length === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
        >
          + Nuevo
        </button>
      </div>

      {sorted.map((c) => {
        const d = daysUntil(c.end_date);
        const expiring = d >= 0 && d <= 30;
        const propName = c.property?.name || "";
        const propType = c.property?.type === "comercial" ? "Comercial" : "Residencial";
        const todayStr = new Date().toISOString().split("T")[0];
        const monthsLeft = monthsBetween(todayStr.slice(0, 7), c.end_date.slice(0, 7));

        return (
          <div
            key={c.id}
            className={`bg-white border rounded-xl px-4 py-3.5 mb-2 ${expiring ? "border-yellow-300" : "border-gray-200"}`}
          >
            <div className="flex gap-3 items-center cursor-pointer" onClick={() => openEdit(c)}>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-lg shrink-0">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{c.tenant_name}</div>
                  {expiring ? (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 shrink-0 ml-2">
                      Vence en {d} días
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0 ml-2">
                      Activo
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{propName} · {propType}</div>
                {expiring ? (
                  <div className="text-xs font-medium mt-1" style={{ color: "#92400E" }}>
                    Vence {formatDateShort(c.end_date)}{d <= 7 ? " · renovar urgente" : ""}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">
                    Vence {formatDateShort(c.end_date)} · {monthsLeft} meses restantes
                  </div>
                )}
              </div>
            </div>
            {expiring && (
              <>
                <div className="h-px bg-gray-100 my-3" />
                <button
                  onClick={() => openRenew(c)}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  Renovar contrato
                </button>
              </>
            )}
          </div>
        );
      })}

      {contracts.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-sm text-gray-400">
          No hay contratos activos
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40" onClick={() => setModal({ open: false, editing: null, renewing: null })}>
          <div
            className="w-full max-w-[430px] bg-white rounded-t-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 40px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - fixed */}
            <div className="px-5 pt-5 pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  {modal.renewing ? "Renovar contrato" : modal.editing ? "Editar contrato" : "Nuevo contrato"}
                </h3>
                {modal.editing && (
                  <button
                    onClick={() => handleDelete(modal.editing!.id)}
                    disabled={deleting === modal.editing.id}
                    className="text-xs text-red-600 font-medium cursor-pointer bg-transparent border-0"
                  >
                    {deleting === modal.editing.id ? "Eliminando..." : "Eliminar"}
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Propiedad</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => {
                      const prop = properties.find((p) => p.id === Number(e.target.value));
                      setForm({ ...form, property_id: e.target.value, rent_amount: prop?.rent_amount?.toString() || form.rent_amount });
                    }}
                    disabled={!!modal.editing || !!modal.renewing}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50"
                  >
                    {(modal.editing || modal.renewing
                      ? properties
                      : availableProps
                    ).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre del inquilino</label>
                  <input
                    type="text"
                    value={form.tenant_name}
                    onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
                    placeholder="Juan Pérez"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                    <input
                      type="tel"
                      value={form.tenant_phone}
                      onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })}
                      placeholder="6000-0000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={form.tenant_email}
                      onChange={(e) => setForm({ ...form, tenant_email: e.target.value })}
                      placeholder="correo@email.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Monto mensual ($)</label>
                  <input
                    type="number"
                    value={form.rent_amount}
                    onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                    placeholder="650"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Buttons - fixed at bottom */}
            <div className="px-5 pt-3 pb-5 shrink-0 border-t border-gray-100" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
              <div className="flex gap-2">
                <button
                  onClick={() => setModal({ open: false, editing: null, renewing: null })}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-800 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.property_id || !form.tenant_name.trim() || !form.rent_amount}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  {saving ? "Guardando..." : modal.renewing ? "Renovar" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
