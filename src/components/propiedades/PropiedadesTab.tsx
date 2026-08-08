"use client";

import { useRouter } from "next/navigation";
import type { RentProperty, RentContract, RentCharge } from "@/lib/propiedades-types";
import {
  summarizeProperty,
  describeProperty,
  fmtMoney,
  paidCents,
  toCents,
  fromCents,
  monthLabelCap,
  type ChargeLike,
  type ContractLike,
} from "@/lib/propiedades-pagos";

type Props = {
  properties: RentProperty[];
  contracts: RentContract[];
  charges: RentCharge[];
  currentMonth: string;
  today: string;
  onGoToContratos: () => void;
};

const TONES = {
  green: "bg-[#34C759]/10 text-[#0F9D3A]",
  red: "bg-[#FF3B30]/10 text-[#D70015]",
  amber: "bg-[#FF9500]/10 text-[#B36A00]",
  blue: "bg-[#007AFF]/10 text-[#007AFF]",
};

const HEADLINE_TONES = {
  green: "text-[#0F9D3A]",
  red: "text-[#D70015]",
  amber: "text-[#B36A00]",
  blue: "text-[#007AFF]",
};

const ORDER: Record<string, number> = { sin_contrato: 0, debe: 1, sin_cobro: 2, al_dia: 3 };

export default function PropiedadesTab({
  properties,
  contracts,
  charges,
  currentMonth,
  today,
  onGoToContratos,
}: Props) {
  const router = useRouter();

  // ── El unico numero del mes ────────────────────────────────────────
  const monthCharges = charges.filter((c) => c.month === currentMonth);
  const cobrado = fromCents(monthCharges.reduce((s, c) => s + paidCents(c as ChargeLike), 0));
  const esperado = fromCents(monthCharges.reduce((s, c) => s + toCents(c.amount), 0));
  const pct = esperado > 0 ? Math.min(100, Math.round((cobrado / esperado) * 100)) : 0;

  // ── Resumen por propiedad ──────────────────────────────────────────
  const rows = properties
    .map((p) => {
      const summary = summarizeProperty({
        property: p,
        contracts: contracts.filter((c) => c.property_id === p.id) as ContractLike[],
        charges: charges.filter((c) => c.property_id === p.id) as ChargeLike[],
        currentMonth,
        today,
      });
      return { property: p, summary, display: describeProperty(summary) };
    })
    .sort((a, b) => {
      const d = (ORDER[a.summary.state] ?? 9) - (ORDER[b.summary.state] ?? 9);
      return d !== 0 ? d : a.property.name.localeCompare(b.property.name);
    });

  const sinContrato = rows.filter((r) => r.summary.state === "sin_contrato");
  const porVencer = contracts.filter((c) => {
    if (!c.active) return false;
    const days = Math.round(
      (Date.parse(c.end_date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000,
    );
    return days >= 0 && days <= 30;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Cobrado del mes: el unico numero */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="text-[15px] text-[#8E8E93] font-medium">
          Cobrado en {monthLabelCap(currentMonth).split(" ")[0].toLowerCase()}
        </div>
        <div className="text-[34px] leading-tight font-bold text-[#1C1C1E] tracking-tight mt-1 break-words">
          {fmtMoney(cobrado)}
        </div>
        <div className="text-[15px] text-[#8E8E93] mt-0.5">de {fmtMoney(esperado)}</div>
        <div className="h-2.5 bg-[#E5E5EA] rounded-full overflow-hidden mt-3">
          <div className="h-full rounded-full bg-[#34C759] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Avisos que si importan */}
      {sinContrato.length > 0 && (
        <button
          onClick={onGoToContratos}
          className="w-full text-left bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-2xl px-4 py-3.5 min-h-[44px] cursor-pointer active:opacity-70"
        >
          <div className="text-[15px] font-semibold text-[#D70015]">
            {sinContrato.length === 1
              ? "1 propiedad sin contrato vigente"
              : `${sinContrato.length} propiedades sin contrato vigente`}
          </div>
          <div className="text-[13px] text-[#D70015]/80 mt-0.5">
            No se le genera cobro. Toca aquí para renovar el contrato.
          </div>
        </button>
      )}
      {porVencer.length > 0 && (
        <button
          onClick={onGoToContratos}
          className="w-full text-left bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-2xl px-4 py-3.5 min-h-[44px] cursor-pointer active:opacity-70"
        >
          <div className="text-[15px] font-semibold text-[#B36A00]">
            {porVencer.length === 1
              ? "1 contrato vence este mes"
              : `${porVencer.length} contratos vencen este mes`}
          </div>
          <div className="text-[13px] text-[#B36A00]/80 mt-0.5">Toca aquí para renovarlo.</div>
        </button>
      )}

      <div className="flex justify-between items-center pt-1">
        <div className="text-[15px] font-semibold text-[#1C1C1E]">
          {properties.length} {properties.length === 1 ? "propiedad" : "propiedades"}
        </div>
        <button
          onClick={() => router.push("/propiedades/nueva")}
          className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
        >
          + Agregar
        </button>
      </div>

      {rows.map(({ property, summary, display }) => (
        <div key={property.id} className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <div className="flex gap-3 items-start">
            <div className="w-[42px] h-[42px] rounded-xl bg-[#F2F2F7] flex items-center justify-center text-xl shrink-0">
              {property.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[17px] font-semibold text-[#1C1C1E] leading-tight break-words min-w-0">
                  {property.name}
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${TONES[display.tone]}`}
                >
                  {display.badge}
                </span>
              </div>
              <div className="text-[13px] text-[#8E8E93] mt-1 break-words">
                {summary.tenantName || "Sin inquilino"} · {fmtMoney(summary.monthlyAmount)}/mes
              </div>
            </div>
          </div>

          <div className={`text-[17px] font-semibold mt-3 break-words ${HEADLINE_TONES[display.tone]}`}>
            {display.headline}
          </div>
          {display.detail && (
            <div className="text-[13px] text-[#8E8E93] mt-1 break-words">{display.detail}</div>
          )}

          <div className="flex gap-2 mt-3.5">
            <button
              onClick={() => router.push(`/propiedades/pagar/${property.id}`)}
              className="flex-1 min-h-[48px] px-3 rounded-xl text-[16px] font-semibold bg-[#34C759] text-white border-0 cursor-pointer active:bg-[#2da44e] transition-colors"
            >
              Registrar pago
            </button>
            {summary.state === "sin_contrato" ? (
              <button
                onClick={() => router.push("/propiedades/contratos/nuevo")}
                className="min-h-[48px] px-4 rounded-xl text-[16px] font-medium border border-[#C6C6C8] bg-white text-[#007AFF] cursor-pointer active:bg-[#F2F2F7] transition-colors shrink-0"
              >
                Contrato
              </button>
            ) : (
              <button
                onClick={() => router.push(`/propiedades/editar/${property.id}`)}
                className="min-h-[48px] px-4 rounded-xl text-[16px] font-medium border border-[#C6C6C8] bg-white text-[#007AFF] cursor-pointer active:bg-[#F2F2F7] transition-colors shrink-0"
              >
                Editar
              </button>
            )}
          </div>
        </div>
      ))}

      {properties.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center text-[15px] text-[#8E8E93]">
          No hay propiedades. Toca &quot;+ Agregar&quot; para crear la primera.
        </div>
      )}
    </div>
  );
}
