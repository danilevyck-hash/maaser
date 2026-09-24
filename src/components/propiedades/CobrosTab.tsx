"use client";

// SIN USO desde el 24-sep-2026: la portada de Propiedades dejó de tener las
// tres pestañas (Propiedades · Cobros · Contratos) y es una sola lista.
// Se conserva un mes por si hay que volver atrás; se borra el 24-oct-2026.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RentCharge } from "@/lib/propiedades-types";
import { useToast } from "@/components/Toast";
import {
  addMonths,
  fmtMoney,
  fromCents,
  isFullyPaid,
  isPartiallyPaid,
  monthLabelCap,
  paidCents,
  pendingCents,
  toCents,
  type ChargeLike,
} from "@/lib/propiedades-pagos";

function daysSince(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((now.getTime() - target.getTime()) / 86400000);
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type Props = {
  charges: RentCharge[];
  currentMonth: string;
  onRefresh: () => void;
};

export default function CobrosTab({ charges, currentMonth, onRefresh }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mes, setMes] = useState(currentMonth);

  const delMes = charges.filter((c) => c.month === mes);

  const sorted = [...delMes].sort((a, b) => {
    const pa = isFullyPaid(a as ChargeLike) ? 0 : 1;
    const pb = isFullyPaid(b as ChargeLike) ? 0 : 1;
    return pa !== pb ? pa - pb : a.tenant_name.localeCompare(b.tenant_name);
  });

  const cobrado = fromCents(delMes.reduce((s, c) => s + paidCents(c as ChargeLike), 0));
  const esperado = fromCents(delMes.reduce((s, c) => s + toCents(c.amount), 0));

  async function generateCharges() {
    setGenerating(true);
    try {
      const res = await fetch("/api/propiedades/charges/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: mes }),
      });
      if (!res.ok) showToast("Error al generar cobros", "error");
      else showToast("Cobros generados");
    } catch {
      showToast("Error de conexión", "error");
    }
    setGenerating(false);
    onRefresh();
  }

  async function markUnpaid(id: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/propiedades/charges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "pendiente", paid_date: null, paid_amount: 0 }),
      });
      if (!res.ok) showToast("Error al marcar como pendiente", "error");
      else showToast("Marcado como pendiente");
    } catch {
      showToast("Error de conexión", "error");
    }
    setSaving(false);
    onRefresh();
  }

  return (
    <div className="p-4 space-y-3">
      {/* Navegacion de mes */}
      <div className="bg-white rounded-2xl shadow-sm px-2 py-2 flex items-center justify-between">
        <button
          onClick={() => setMes(addMonths(mes, -1))}
          aria-label="Mes anterior"
          className="min-w-[44px] min-h-[44px] rounded-xl text-[20px] text-[#007AFF] bg-transparent border-0 cursor-pointer active:bg-[#F2F2F7]"
        >
          &lsaquo;
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold text-[#1C1C1E]">{monthLabelCap(mes)}</div>
          <div className="text-[13px] text-[#8E8E93]">
            {fmtMoney(cobrado)} de {fmtMoney(esperado)}
          </div>
        </div>
        <button
          onClick={() => setMes(addMonths(mes, 1))}
          aria-label="Mes siguiente"
          className="min-w-[44px] min-h-[44px] rounded-xl text-[20px] text-[#007AFF] bg-transparent border-0 cursor-pointer active:bg-[#F2F2F7]"
        >
          &rsaquo;
        </button>
      </div>

      {mes !== currentMonth && (
        <button
          onClick={() => setMes(currentMonth)}
          className="w-full min-h-[44px] rounded-xl text-[15px] font-medium border border-[#C6C6C8] bg-white text-[#007AFF] cursor-pointer active:bg-[#F2F2F7]"
        >
          Volver a {monthLabelCap(currentMonth)}
        </button>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((ch) => {
          const initials = getInitials(ch.tenant_name);
          const propName = ch.property?.name || "";
          const pagado = isFullyPaid(ch as ChargeLike);
          const parcial = isPartiallyPaid(ch as ChargeLike);
          const falta = fromCents(pendingCents(ch as ChargeLike));
          const abonado = fromCents(paidCents(ch as ChargeLike));

          let subText = propName;
          if (pagado && ch.paid_date) {
            const [, pm, pd] = ch.paid_date.split("-");
            const monthAbbr = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
            subText += ` · pagó el ${Number(pd)} ${monthAbbr[Number(pm)]}`;
          } else if (parcial) {
            subText += ` · abono ${fmtMoney(abonado)}`;
          } else {
            const d = daysSince(ch.due_date);
            if (d > 0) subText += ` · venció hace ${d} días`;
          }

          const tone = pagado
            ? "bg-[#34C759]/10 text-[#0F9D3A]"
            : parcial
              ? "bg-[#FF9500]/10 text-[#B36A00]"
              : "bg-[#FF3B30]/10 text-[#D70015]";
          const label = pagado ? "Pagado" : parcial ? "Abonado" : "Pendiente";

          return (
            <div key={ch.id} className="bg-white rounded-2xl shadow-sm px-4 py-3.5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-[44px] h-[44px] rounded-full ${tone} text-[13px] font-semibold flex items-center justify-center shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[#1C1C1E] break-words">{ch.tenant_name}</div>
                  <div className="text-[13px] text-[#8E8E93] mt-0.5 break-words">{subText}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${tone} shrink-0`}>
                  {label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={`text-[20px] font-bold tracking-tight ${pagado ? "text-[#1C1C1E]" : "text-[#D70015]"}`}>
                    {fmtMoney(Number(ch.amount))}
                  </div>
                  {parcial && <div className="text-[13px] text-[#B36A00]">falta {fmtMoney(falta)}</div>}
                </div>
                {!pagado ? (
                  <button
                    onClick={() => router.push(`/propiedades/cobros/${ch.id}/pagar`)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#34C759] text-white border-0 cursor-pointer active:bg-[#2da44e] transition-colors shrink-0"
                  >
                    Marcar pagado
                  </button>
                ) : (
                  <button
                    onClick={() => markUnpaid(ch.id)}
                    disabled={saving}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-medium border border-[#C6C6C8] bg-white text-[#8E8E93] cursor-pointer active:bg-[#F2F2F7] transition-colors disabled:opacity-50 shrink-0"
                  >
                    Desmarcar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {delMes.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center">
          <div className="text-[15px] text-[#8E8E93] mb-3">No hay cobros de {monthLabelCap(mes)}</div>
          <button
            onClick={generateCharges}
            disabled={generating}
            className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50"
          >
            {generating ? "Generando..." : "Generar cobros del mes"}
          </button>
        </div>
      )}
    </div>
  );
}
