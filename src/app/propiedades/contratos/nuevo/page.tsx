"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RentProperty, RentContract } from "@/lib/propiedades-types";
import { useToast } from "@/components/Toast";

export default function NuevoContratoPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-[#8E8E93] text-[15px]">Cargando...</div>
      </div>
    }>
      <NuevoContrato />
    </Suspense>
  );
}

function NuevoContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const renewId = searchParams.get("renew");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<RentProperty[]>([]);
  const [availableProps, setAvailableProps] = useState<RentProperty[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const inOneYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

  const [form, setForm] = useState({
    property_id: "", tenant_name: "", tenant_phone: "", tenant_email: "",
    start_date: today, end_date: inOneYear, rent_amount: "",
  });

  const [renewContract, setRenewContract] = useState<RentContract | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/propiedades/properties").then((r) => r.json()),
      fetch("/api/propiedades/contracts").then((r) => r.json()),
    ]).then(([props, contracts]: [RentProperty[], RentContract[]]) => {
      setProperties(props);
      const activeContracts = (contracts || []).filter((c: RentContract) => c.active);
      const occupiedIds = new Set(activeContracts.map((c: RentContract) => c.property_id));
      const avail = props.filter((p: RentProperty) => !occupiedIds.has(p.id));
      setAvailableProps(avail);

      if (renewId) {
        const contract = activeContracts.find((c: RentContract) => c.id === Number(renewId));
        if (contract) {
          setRenewContract(contract);
          const newStart = contract.end_date;
          const endDate = new Date(newStart + "T00:00:00");
          endDate.setFullYear(endDate.getFullYear() + 1);
          setForm({
            property_id: String(contract.property_id),
            tenant_name: contract.tenant_name,
            tenant_phone: contract.tenant_phone || "",
            tenant_email: contract.tenant_email || "",
            start_date: newStart,
            end_date: endDate.toISOString().split("T")[0],
            rent_amount: String(contract.rent_amount),
          });
        }
      } else if (avail.length > 0) {
        setForm((f) => ({ ...f, property_id: String(avail[0].id), rent_amount: String(avail[0].rent_amount) }));
      }
      setLoading(false);
    });
  }, [renewId]);

  async function handleSave() {
    if (!form.property_id || !form.tenant_name.trim() || !form.rent_amount) return;
    setSaving(true);
    if (renewContract) {
      await fetch("/api/propiedades/contracts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: renewContract.id, active: false }) });
    }
    const res = await fetch("/api/propiedades/contracts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: Number(form.property_id), tenant_name: form.tenant_name, tenant_phone: form.tenant_phone || null, tenant_email: form.tenant_email || null, start_date: form.start_date, end_date: form.end_date, rent_amount: Number(form.rent_amount) }),
    });
    if (!res.ok) { showToast("Error al crear contrato", "error"); setSaving(false); return; }
    showToast(renewContract ? "Contrato renovado" : "Contrato creado");
    router.push("/propiedades");
  }

  const selectProps = renewContract ? properties : availableProps;
  const inputClass = "w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white";

  if (loading) return <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex items-center justify-center"><div className="text-[#8E8E93] text-[15px]">Cargando...</div></div>;

  return (
    <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col" style={{ height: "100dvh" }}>
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center gap-3 max-w-[430px] mx-auto">
          <button onClick={() => router.push("/propiedades")} className="text-[15px] text-[#007AFF] font-medium bg-transparent border-0 cursor-pointer">&larr; Volver</button>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">{renewContract ? "Renovar contrato" : "Nuevo contrato"}</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-5 py-5 flex flex-col gap-5">
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Propiedad</label>
            <select value={form.property_id} onChange={(e) => { const prop = properties.find((p) => p.id === Number(e.target.value)); setForm({ ...form, property_id: e.target.value, rent_amount: prop?.rent_amount?.toString() || form.rent_amount }); }} disabled={!!renewContract} className={`${inputClass} disabled:bg-[#F2F2F7]`}>
              {selectProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Nombre del inquilino</label>
            <input type="text" value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} placeholder="Juan Perez" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Telefono</label>
              <input type="tel" value={form.tenant_phone} onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })} placeholder="6000-0000" className={inputClass} />
            </div>
            <div>
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Email</label>
              <input type="email" value={form.tenant_email} onChange={(e) => setForm({ ...form, tenant_email: e.target.value })} placeholder="correo@email.com" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Fecha inicio</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Fecha fin</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Monto mensual ($)</label>
            <input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} placeholder="650" min="0" step="0.01" className={inputClass} />
          </div>
          <button onClick={handleSave} disabled={saving || !form.property_id || !form.tenant_name.trim() || !form.rent_amount} className="w-full h-12 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50 mt-2">
            {saving ? "Guardando..." : renewContract ? "Renovar contrato" : "Crear contrato"}
          </button>
        </div>
      </div>
    </div>
  );
}
