"use client";

import { useState } from "react";
import type { RentProperty, RentContract, RentCharge } from "@/lib/propiedades-types";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

const ICONS = ["🏠", "🏢", "🏪", "🏘️", "🏗️"];

type Props = {
  properties: RentProperty[];
  contracts: RentContract[];
  charges: RentCharge[];
  onRefresh: () => void;
};

type ModalState = { open: boolean; editing: RentProperty | null };

export default function PropiedadesTab({ properties, contracts, charges, onRefresh }: Props) {
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    type: "residencial",
    icon: "🏠",
    rent_amount: "",
  });

  function openAdd() {
    setForm({ name: "", location: "", type: "residencial", icon: "🏠", rent_amount: "" });
    setModal({ open: true, editing: null });
  }

  function openEdit(p: RentProperty) {
    setForm({
      name: p.name,
      location: p.location,
      type: p.type,
      icon: p.icon,
      rent_amount: String(p.rent_amount),
    });
    setModal({ open: true, editing: p });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.rent_amount) return;
    setSaving(true);
    const body = {
      ...form,
      rent_amount: Number(form.rent_amount),
      ...(modal.editing ? { id: modal.editing.id } : {}),
    };
    await fetch("/api/propiedades/properties", {
      method: modal.editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setModal({ open: false, editing: null });
    onRefresh();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta propiedad? Se borrarán sus cobros y contratos.")) return;
    setDeleting(id);
    await fetch("/api/propiedades/properties", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    onRefresh();
  }

  function getStatus(p: RentProperty) {
    const contract = contracts.find((c) => c.property_id === p.id);
    if (!contract) return { label: "Vacía", color: "blue" as const, tenant: "Sin inquilino" };

    const d = daysUntil(contract.end_date);
    if (d >= 0 && d <= 30) return { label: "Vence pronto", color: "amber" as const, tenant: contract.tenant_name };

    const charge = charges.find((c) => c.property_id === p.id);
    if (charge?.status === "mora") return { label: "Mora", color: "red" as const, tenant: contract.tenant_name };
    if (charge?.status === "pendiente") return { label: "Pendiente", color: "red" as const, tenant: contract.tenant_name };

    return { label: "Al día", color: "green" as const, tenant: contract.tenant_name };
  }

  const badgeColors = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3.5">
        <div className="text-[13px] font-semibold text-gray-800">{properties.length} propiedades</div>
        <button onClick={openAdd} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-95 transition-transform">
          + Agregar
        </button>
      </div>

      {properties.map((p) => {
        const status = getStatus(p);
        const shortTenant = status.tenant.length > 15 ? status.tenant.split(" ")[0] + " " + (status.tenant.split(" ")[1]?.[0] || "") + "." : status.tenant;
        return (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-2 cursor-pointer active:bg-gray-50" onClick={() => openEdit(p)}>
            <div className="flex gap-3 items-center">
              <div className="w-[42px] h-[42px] rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeColors[status.color]} shrink-0 ml-2`}>
                    {status.label}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {p.location}{p.location && " · "}{p.type === "comercial" ? "Comercial" : "Residencial"} · {shortTenant}
                </div>
                <div className="text-[13px] font-semibold text-gray-800 mt-1">{fmt(Number(p.rent_amount))}/mes</div>
              </div>
            </div>
          </div>
        );
      })}

      {properties.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-sm text-gray-400">
          No hay propiedades. Agregá tu primera propiedad.
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40" onClick={() => setModal({ open: false, editing: null })}>
          <div className="w-full max-w-[430px] bg-white rounded-t-2xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {modal.editing ? "Editar propiedad" : "Nueva propiedad"}
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

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Casa Albrook"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ubicación</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Albrook"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                  </select>
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
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Icono</label>
                <div className="flex gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center cursor-pointer border-2 transition-colors ${
                        form.icon === icon ? "border-blue-700 bg-blue-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModal({ open: false, editing: null })}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-800 cursor-pointer active:scale-[0.97] transition-transform"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.rent_amount}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
