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
    // Fetch all charges to find this one (no single-charge endpoint)
    fetch("/api/propiedades/charges")
      .then((r) => r.json())
      .then((data: RentCharge[]) => {
        const found = data.find((c) => c.id === id);
        if (found) setCharge(found);
        setLoading(false);
      });
  }, [id]);

  async function handlePay() {
    setSaving(true);
    const res = await fetch("/api/propiedades/charges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "pagado", paid_date: payDate }),
    });
    if (!res.ok) {
      showToast("Error al registrar pago", "error");
      setSaving(false);
      return;
    }
    showToast("Pago registrado");
    router.push("/propiedades?tab=cobros");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="text-gray-400 text-sm">Cargando...</div>
      </div>
    );
  }

  if (!charge) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="text-gray-400 text-sm">Cobro no encontrado</div>
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
        <div className="flex items-center gap-3 max-w-[430px] mx-auto">
          <button
            onClick={() => router.push("/propiedades?tab=cobros")}
            className="text-sm text-blue-700 font-medium bg-transparent border-0 cursor-pointer"
          >
            ← Volver
          </button>
          <h1 className="text-base font-semibold text-gray-900">Registrar pago</h1>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-5 py-5">
          <div className="flex flex-col gap-5">
            {/* Charge info card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-900">{charge.tenant_name}</div>
              <div className="text-xs text-gray-400 mt-1">{charge.property?.name || ""}</div>
              <div className="text-2xl font-semibold text-gray-900 mt-3 tracking-tight">{fmt(Number(charge.amount))}</div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-medium">Fecha de pago</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handlePay}
              disabled={saving}
              className="w-full py-3.5 rounded-lg text-sm font-semibold bg-emerald-700 text-white border-0 cursor-pointer active:scale-[0.97] transition-transform disabled:opacity-50 mt-2"
            >
              {saving ? "Guardando..." : "Confirmar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
