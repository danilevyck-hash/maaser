"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import type { RentProperty, RentContract, RentCharge } from "@/lib/propiedades-types";
import { useToast } from "@/components/Toast";
import { todayLocalISO } from "@/lib/format";
import {
  allocatePayment,
  amountToCoverThrough,
  describeAllocation,
  describeProperty,
  firstUnpaidMonth,
  fmtMoney,
  addMonths,
  monthLabel,
  monthLabelCap,
  monthOf,
  monthlyAmountFor,
  summarizeProperty,
  type ChargeLike,
  type ContractLike,
} from "@/lib/propiedades-pagos";

type Modo = "hasta" | "monto";

export default function RegistrarPagoPropiedad() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<RentProperty | null>(null);
  const [contracts, setContracts] = useState<RentContract[]>([]);
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [partialSupported, setPartialSupported] = useState(true);
  const [avisoMigracion, setAvisoMigracion] = useState<string | null>(null);

  const [modo, setModo] = useState<Modo>("hasta");
  const [hastaMes, setHastaMes] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(todayLocalISO());

  const today = todayLocalISO();
  const currentMonth = monthOf(today);

  useEffect(() => {
    Promise.all([
      fetch("/api/propiedades/properties").then((r) => { if (!r.ok) throw new Error("x"); return r.json(); }),
      fetch("/api/propiedades/contracts").then((r) => { if (!r.ok) throw new Error("x"); return r.json(); }),
      fetch(`/api/propiedades/charges?property_id=${id}`).then((r) => { if (!r.ok) throw new Error("x"); return r.json(); }),
      fetch("/api/propiedades/pagos").then((r) => (r.ok ? r.json() : { partial_supported: true })),
    ])
      .then(([props, ctrs, chs, cap]) => {
        setProperty((props as RentProperty[]).find((p) => p.id === id) || null);
        setContracts((ctrs as RentContract[]).filter((c) => c.property_id === id));
        setCharges(chs as RentCharge[]);
        setPartialSupported(cap?.partial_supported !== false);
        setAvisoMigracion(cap?.partial_supported === false ? cap.message : null);
        setLoading(false);
      })
      .catch(() => { showToast("Error al cargar la propiedad", "error"); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startMonth = useMemo(
    () => firstUnpaidMonth(charges as ChargeLike[], currentMonth),
    [charges, currentMonth],
  );

  const amountForMonth = useMemo(
    () => (m: string) => monthlyAmountFor(m, contracts as ContractLike[], property),
    [contracts, property],
  );

  useEffect(() => {
    if (!hastaMes) setHastaMes(startMonth);
  }, [startMonth, hastaMes]);

  const summary = useMemo(() => {
    if (!property) return null;
    return summarizeProperty({
      property,
      contracts: contracts as ContractLike[],
      charges: charges as ChargeLike[],
      currentMonth,
      today,
    });
  }, [property, contracts, charges, currentMonth, today]);

  const opcionesMes = useMemo(
    () => Array.from({ length: 24 }, (_, i) => addMonths(startMonth, i)),
    [startMonth],
  );

  const totalHasta = useMemo(() => {
    if (!hastaMes) return 0;
    return amountToCoverThrough({
      startMonth,
      throughMonth: hastaMes,
      charges: charges as ChargeLike[],
      amountForMonth,
    });
  }, [hastaMes, startMonth, charges, amountForMonth]);

  const preview = useMemo(() => {
    const amount = modo === "hasta" ? totalHasta : Number(monto);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return allocatePayment({
      amount,
      startMonth,
      charges: charges as ChargeLike[],
      amountForMonth,
      throughMonth: modo === "hasta" ? hastaMes : null,
      maxMonths: 36,
    });
  }, [modo, totalHasta, monto, startMonth, charges, amountForMonth, hastaMes]);

  const necesitaParcial = !!preview?.allocations.some((a) => !a.fullyPaid);
  const bloqueado = necesitaParcial && !partialSupported;
  const puedeGuardar = !!preview && preview.allocations.length > 0 && !bloqueado && !saving;

  async function handleSave() {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const res = await fetch("/api/propiedades/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: id,
          mode: modo,
          through_month: modo === "hasta" ? hastaMes : null,
          amount: modo === "monto" ? Number(monto) : null,
          paid_date: fecha,
          current_month: currentMonth,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error || "No se pudo registrar el pago", "error");
        setSaving(false);
        return;
      }
      showToast("Pago registrado");
      router.push("/propiedades");
    } catch {
      showToast("Error de conexión", "error");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-[#C6C6C8] rounded-xl px-4 py-3.5 text-[17px] focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white";

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-[#8E8E93] text-[15px]">Cargando...</div>
      </div>
    );
  }
  if (!property) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col items-center justify-center gap-4">
        <div className="text-[#8E8E93] text-[15px]">Propiedad no encontrada</div>
        <button
          onClick={() => router.push("/propiedades")}
          className="min-h-[48px] px-5 rounded-xl text-[16px] font-semibold bg-[#007AFF] text-white border-0"
        >
          Volver
        </button>
      </div>
    );
  }

  const display = summary ? describeProperty(summary) : null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#F2F2F7] flex flex-col" style={{ height: "100dvh" }}>
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center gap-3 max-w-[430px] mx-auto">
          <button
            onClick={() => router.push("/propiedades")}
            className="text-[15px] text-[#007AFF] font-medium bg-transparent border-0 cursor-pointer min-h-[44px]"
          >
            &larr; Volver
          </button>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Registrar pago</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-4 py-5 flex flex-col gap-4 pb-10">
          {/* Quien paga */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-[17px] font-semibold text-[#1C1C1E] break-words">{property.name}</div>
            <div className="text-[15px] text-[#8E8E93] mt-1 break-words">
              {summary?.tenantName || "Sin inquilino"} · {fmtMoney(summary?.monthlyAmount ?? property.rent_amount)}/mes
            </div>
            {display && (
              <div className="text-[15px] font-medium text-[#1C1C1E] mt-2 break-words">{display.headline}</div>
            )}
          </div>

          {avisoMigracion && (
            <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-2xl px-4 py-3 text-[13px] text-[#B36A00]">
              {avisoMigracion}
            </div>
          )}

          {/* Modo */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setModo("hasta")}
              className={`w-full text-left rounded-2xl px-4 py-4 min-h-[56px] border-2 cursor-pointer transition-colors ${
                modo === "hasta" ? "border-[#007AFF] bg-[#007AFF]/5" : "border-[#C6C6C8] bg-white"
              }`}
            >
              <div className="text-[17px] font-semibold text-[#1C1C1E]">Me pagó hasta un mes</div>
              <div className="text-[13px] text-[#8E8E93] mt-0.5">Ejemplo: me pagó todo el resto del año</div>
            </button>
            <button
              onClick={() => setModo("monto")}
              className={`w-full text-left rounded-2xl px-4 py-4 min-h-[56px] border-2 cursor-pointer transition-colors ${
                modo === "monto" ? "border-[#007AFF] bg-[#007AFF]/5" : "border-[#C6C6C8] bg-white"
              }`}
            >
              <div className="text-[17px] font-semibold text-[#1C1C1E]">Me dio un monto</div>
              <div className="text-[13px] text-[#8E8E93] mt-0.5">
                Se reparte mes por mes. Lo que sobra queda a favor.
              </div>
            </button>
          </div>

          {startMonth > currentMonth && (
            <div className="bg-[#34C759]/10 border border-[#34C759]/30 rounded-2xl px-4 py-3 text-[13px] text-[#0F9D3A]">
              Ya está cubierto hasta {monthLabel(addMonths(startMonth, -1))}. El próximo mes por cobrar es{" "}
              {monthLabel(startMonth)}.
            </div>
          )}

          {modo === "hasta" ? (
            <div>
              <label className="text-[15px] text-[#1C1C1E] mb-2 block font-medium">Me pagó hasta:</label>
              <select value={hastaMes} onChange={(e) => setHastaMes(e.target.value)} className={inputClass}>
                {opcionesMes.map((m) => (
                  <option key={m} value={m}>
                    {monthLabelCap(m)}
                  </option>
                ))}
              </select>
              <div className="text-[15px] text-[#8E8E93] mt-2">
                Se va a registrar <span className="font-semibold text-[#1C1C1E]">{fmtMoney(totalHasta)}</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[15px] text-[#1C1C1E] mb-2 block font-medium">Cuánto te dio ($)</label>
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="500"
                min="0"
                step="0.01"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="text-[15px] text-[#1C1C1E] mb-2 block font-medium">Fecha del pago</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
          </div>

          {/* Que va a pasar */}
          {preview && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="text-[13px] text-[#8E8E93] font-medium mb-2">Qué va a pasar</div>
              {describeAllocation(preview).map((linea, i) => (
                <div key={i} className="text-[15px] text-[#1C1C1E] mb-1 break-words">
                  · {linea}
                </div>
              ))}
            </div>
          )}

          {bloqueado && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-2xl px-4 py-3 text-[13px] text-[#D70015]">
              Este pago deja un mes a medias y todavía no se puede guardar. Registra un monto exacto de meses
              completos, o pídele a Daniel que corra el cambio pendiente en la base de datos.
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!puedeGuardar}
            className="w-full min-h-[52px] rounded-xl text-[17px] font-semibold bg-[#34C759] text-white border-0 cursor-pointer active:bg-[#2da44e] transition-colors disabled:opacity-40"
          >
            {saving
              ? "Guardando..."
              : preview
                ? `Confirmar ${fmtMoney(preview.applied)}`
                : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
