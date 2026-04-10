"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { RentProperty } from "@/lib/propiedades-types";
import { useToast } from "@/components/Toast";

const ICONS = ["🏠", "🏢", "🏪", "🏘️", "🏗️"];

export default function EditarPropiedad() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", type: "residencial", icon: "🏠", rent_amount: "" });

  useEffect(() => {
    fetch("/api/propiedades/properties")
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then((data: RentProperty[]) => {
        const p = data.find((x) => x.id === id);
        if (p) setForm({ name: p.name, location: p.location, type: p.type, icon: p.icon, rent_amount: String(p.rent_amount) });
        setLoading(false);
      })
      .catch(() => { showToast("Error al cargar propiedad", "error"); setLoading(false); });
  }, [id]);

  async function handleSave() {
    if (!form.name.trim() || !form.rent_amount) return;
    setSaving(true);
    const res = await fetch("/api/propiedades/properties", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...form, rent_amount: Number(form.rent_amount) }) });
    if (!res.ok) { showToast("Error al guardar", "error"); setSaving(false); return; }
    showToast("Propiedad actualizada");
    router.push("/propiedades");
  }

  async function handleDelete() {
    if (!confirm("Eliminar esta propiedad?")) return;
    setDeleting(true);
    const res = await fetch("/api/propiedades/properties", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) { showToast("Error al eliminar", "error"); setDeleting(false); return; }
    showToast("Propiedad eliminada");
    router.push("/propiedades");
  }

  const inputClass = "w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white";

  if (loading) {
    return <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex items-center justify-center"><div className="text-[#8E8E93] text-[15px]">Cargando...</div></div>;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col" style={{ height: "100dvh" }}>
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/propiedades")} className="text-[15px] text-[#007AFF] font-medium bg-transparent border-0 cursor-pointer">&larr; Volver</button>
            <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Editar propiedad</h1>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="text-[13px] text-[#FF3B30] font-medium bg-transparent border-0 cursor-pointer">
            {deleting ? "..." : "Eliminar"}
          </button>
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
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Monto ($)</label>
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
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
