"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { RentCharge } from "@/lib/propiedades-types";
import { useToast } from "@/components/Toast";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PagarCobro() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [charge, setCharge] = useState<RentCharge | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/propiedades/charges").then((r) => r.json()).then((data: RentCharge[]) => {
      const found = data.find((c) => c.id === id);
      if (found) setCharge(found);
      setLoading(false);
    });
  }, [id]);

  async function handlePay() {
    setSaving(true);
    const res = await fetch("/api/propiedades/charges", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "pagado", paid_date: payDate }) });
    if (!res.ok) { showToast("Error al registrar pago", "error"); setSaving(false); return; }
    showToast("Pago registrado");
    router.push("/propiedades?tab=cobros");
  }

  if (loading) return <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex items-center justify-center"><div className="text-[#8E8E93] text-[15px]">Cargando...</div></div>;
  if (!charge) return <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex items-center justify-center"><div className="text-[#8E8E93] text-[15px]">Cobro no encontrado</div></div>;

  return (
    <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col" style={{ height: "100dvh" }}>
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center gap-3 max-w-[430px] mx-auto">
          <button onClick={() => router.push("/propiedades?tab=cobros")} className="text-[15px] text-[#007AFF] font-medium bg-transparent border-0 cursor-pointer">&larr; Volver</button>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Registrar pago</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-5 py-5 flex flex-col gap-5">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-[15px] font-medium text-[#1C1C1E]">{charge.tenant_name}</div>
            <div className="text-[13px] text-[#8E8E93] mt-1">{charge.property?.name || ""}</div>
            <div className="text-[22px] font-bold text-[#1C1C1E] mt-3">{fmt(Number(charge.amount))}</div>
          </div>
          <div>
            <label className="text-[13px] text-[#8E8E93] mb-1.5 block font-medium">Fecha de pago</label>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white" />
          </div>
          <button onClick={handlePay} disabled={saving} className="w-full h-12 rounded-xl text-[15px] font-semibold bg-[#34C759] text-white border-0 cursor-pointer active:bg-[#2da44e] transition-colors disabled:opacity-50 mt-2">
            {saving ? "Guardando..." : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
