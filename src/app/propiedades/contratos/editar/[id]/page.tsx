"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { RentProperty, RentContract } from "@/lib/propiedades-types";

export default function EditarContrato() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [properties, setProperties] = useState<RentProperty[]>([]);

  const [form, setForm] = useState({
    property_id: "",
    tenant_name: "",
    tenant_phone: "",
    tenant_email: "",
    start_date: "",
    end_date: "",
    rent_amount: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/propiedades/properties").then((r) => r.json()),
      fetch("/api/propiedades/contracts").then((r) => r.json()),
    ]).then(([props, contracts]: [RentProperty[], RentContract[]]) => {
      setProperties(props);
      const contract = contracts.find((c: RentContract) => c.id === id);
      if (contract) {
        setForm({
          property_id: String(contract.property_id),
          tenant_name: contract.tenant_name,
          tenant_phone: contract.tenant_phone || "",
          tenant_email: contract.tenant_email || "",
          start_date: contract.start_date,
          end_date: contract.end_date,
          rent_amount: String(contract.rent_amount),
        });
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!form.property_id || !form.tenant_name.trim() || !form.rent_amount) return;
    setSaving(true);
    await fetch("/api/propiedades/contracts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        property_id: Number(form.property_id),
        tenant_name: form.tenant_name,
        tenant_phone: form.tenant_phone || null,
        tenant_email: form.tenant_email || null,
        start_date: form.start_date,
        end_date: form.end_date,
        rent_amount: Number(form.rent_amount),
      }),
    });
    router.push("/propiedades");
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este contrato?")) return;
    setDeleting(true);
    await fetch("/api/propiedades/contracts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.push("/propiedades");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="text-gray-400 text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-50 flex flex-col"
      style={{ height: "100dvh", fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/propiedades")}
              className="text-sm text-blue-700 font-medium bg-transparent border-0 cursor-pointer"
            >
              ← Volver
            </button>
            <h1 className="text-base font-semibold text-gray-900">Editar contrato</h1>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-600 font-medium bg-transparent border-0 cursor-pointer"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-5 py-5">
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Propiedad</label>
              <select
                value={form.property_id}
                onChange={(e) => {
                  const prop = properties.find((p) => p.id === Number(e.target.value));
                  setForm({ ...form, property_id: e.target.value, rent_amount: prop?.rent_amount?.toString() || form.rent_amount });
                }}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Nombre del inquilino</label>
              <input
                type="text"
                value={form.tenant_name}
                onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
                placeholder="Juan Pérez"
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Teléfono</label>
                <input
                  type="tel"
                  value={form.tenant_phone}
                  onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })}
                  placeholder="6000-0000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Email</label>
                <input
                  type="email"
                  value={form.tenant_email}
                  onChange={(e) => setForm({ ...form, tenant_email: e.target.value })}
                  placeholder="correo@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Fecha inicio</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Fecha fin</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Monto mensual ($)</label>
              <input
                type="number"
                value={form.rent_amount}
                onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                placeholder="650"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.property_id || !form.tenant_name.trim() || !form.rent_amount}
              className="w-full py-3.5 rounded-lg text-sm font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-[0.97] transition-transform disabled:opacity-50 mt-2"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
