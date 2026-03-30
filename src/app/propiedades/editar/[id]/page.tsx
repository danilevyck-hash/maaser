"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { RentProperty } from "@/lib/propiedades-types";

const ICONS = ["🏠", "🏢", "🏪", "🏘️", "🏗️"];

export default function EditarPropiedad() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    type: "residencial",
    icon: "🏠",
    rent_amount: "",
  });

  useEffect(() => {
    fetch("/api/propiedades/properties")
      .then((r) => r.json())
      .then((data: RentProperty[]) => {
        const p = data.find((x) => x.id === id);
        if (p) {
          setForm({
            name: p.name,
            location: p.location,
            type: p.type,
            icon: p.icon,
            rent_amount: String(p.rent_amount),
          });
        }
        setLoading(false);
      });
  }, [id]);

  async function handleSave() {
    if (!form.name.trim() || !form.rent_amount) return;
    setSaving(true);
    await fetch("/api/propiedades/properties", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...form, rent_amount: Number(form.rent_amount) }),
    });
    router.push("/propiedades");
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta propiedad? Se borrarán sus cobros y contratos.")) return;
    setDeleting(true);
    await fetch("/api/propiedades/properties", {
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
            <h1 className="text-base font-semibold text-gray-900">Editar propiedad</h1>
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
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Casa Albrook"
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Ubicación</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Albrook"
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                </select>
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Icono</label>
              <div className="flex gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={`w-12 h-12 rounded-lg text-xl flex items-center justify-center cursor-pointer border-2 transition-colors ${
                      form.icon === icon ? "border-blue-700 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.rent_amount}
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
