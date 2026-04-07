"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const ICONS = ["🏠", "🏢", "🏪", "🏘️", "🏗️"];

export default function NuevaPropiedad() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    type: "residencial",
    icon: "🏠",
    rent_amount: "",
  });

  async function handleSave() {
    if (!form.name.trim() || !form.rent_amount) return;
    setSaving(true);
    const res = await fetch("/api/propiedades/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rent_amount: Number(form.rent_amount) }),
    });
    if (!res.ok) {
      showToast("Error al guardar propiedad", "error");
      setSaving(false);
      return;
    }
    showToast("Propiedad creada");
    router.push("/propiedades");
  }

  const inputClass = "w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white";

  return (
    <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col" style={{ height: "100dvh" }}>
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center gap-3 max-w-[430px] mx-auto">
          <button onClick={() => router.push("/propiedades")} className="text-[15px] text-[#007AFF] font-medium bg-transparent border-0 cursor-pointer">&larr; Volver</button>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Nueva propiedad</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-5 py-5 flex flex-col gap-5">
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Nombre</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Casa Albrook" className={inputClass} />
          </div>
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Ubicacion</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Albrook" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${inputClass} bg-white`}>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Monto mensual ($)</label>
              <input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} placeholder="650" min="0" step="0.01" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Icono</label>
            <div className="flex gap-2">
              {ICONS.map((icon) => (
                <button key={icon} onClick={() => setForm({ ...form, icon })} className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center cursor-pointer border-2 transition-colors ${form.icon === icon ? "border-[#007AFF] bg-[#007AFF]/10" : "border-[#C6C6C8] bg-white"}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.rent_amount} className="w-full h-12 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50 mt-2">
            {saving ? "Guardando..." : "Guardar propiedad"}
          </button>
        </div>
      </div>
    </div>
  );
}
