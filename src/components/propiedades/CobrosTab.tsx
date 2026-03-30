"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RentCharge } from "@/lib/propiedades-types";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysSince(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((now.getTime() - target.getTime()) / 86400000);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = {
  charges: RentCharge[];
  currentMonth: string;
  onRefresh: () => void;
};

export default function CobrosTab({ charges, currentMonth, onRefresh }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [y, m] = currentMonth.split("-");
  const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthLabel = `${monthNames[Number(m)]} ${y}`;

  // Sort: pagado first, then pendiente, then mora
  const sorted = [...charges].sort((a, b) => {
    const order = { pagado: 0, pendiente: 1, mora: 2 };
    return (order[a.status] || 0) - (order[b.status] || 0);
  });

  async function generateCharges() {
    setGenerating(true);
    await fetch("/api/propiedades/charges/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: currentMonth }),
    });
    setGenerating(false);
    onRefresh();
  }

  async function markUnpaid(id: number) {
    setSaving(true);
    await fetch("/api/propiedades/charges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "pendiente", paid_date: null }),
    });
    setSaving(false);
    onRefresh();
  }

  const initialsColors = {
    pagado: "bg-emerald-50 text-emerald-700",
    pendiente: "bg-red-50 text-red-700",
    mora: "bg-amber-50 text-amber-800",
  };

  const badgeConfig = {
    pagado: { bg: "bg-emerald-50 text-emerald-700", label: "Pagado" },
    pendiente: { bg: "bg-red-50 text-red-700", label: "Pendiente" },
    mora: { bg: "bg-amber-50 text-amber-800", label: "" },
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3.5">
        <div className="text-[13px] font-semibold text-gray-800">Cobros · {monthLabel}</div>
        <button
          onClick={generateCharges}
          disabled={generating}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
        >
          {generating ? "Generando..." : "Generar cobros"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((ch) => {
          const initials = getInitials(ch.tenant_name);
          const propName = ch.property?.name || "";
          const borderColor =
            ch.status === "pendiente" ? "border-red-300" :
            ch.status === "mora" ? "border-yellow-300" : "border-gray-200";

          let subText = propName;
          if (ch.status === "pagado" && ch.paid_date) {
            const [, pm, pd] = ch.paid_date.split("-");
            const monthAbbr = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
            subText += ` · pagó el ${Number(pd)} ${monthAbbr[Number(pm)]}`;
          } else if (ch.status === "pendiente") {
            const d = daysSince(ch.due_date);
            if (d > 0) subText += ` · venció hace ${d} días`;
          } else if (ch.status === "mora") {
            const d = daysSince(ch.due_date);
            subText += ` · ${d} días de mora`;
          }

          const badge = badgeConfig[ch.status];
          const badgeLabel = ch.status === "mora" ? `${daysSince(ch.due_date)} días mora` : badge.label;

          return (
            <div key={ch.id} className={`bg-white border ${borderColor} rounded-xl px-4 py-3.5`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-[38px] h-[38px] rounded-full ${initialsColors[ch.status]} text-xs font-semibold flex items-center justify-center shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{ch.tenant_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{subText}</div>
                </div>
                <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.bg} shrink-0`}>
                  {badgeLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-lg font-semibold tracking-tight ${
                  ch.status === "pagado" ? "text-gray-900" :
                  ch.status === "pendiente" ? "text-red-700" : ""
                }`} style={ch.status === "mora" ? { color: "#B45309" } : undefined}>
                  {fmt(Number(ch.amount))}
                </div>
                {ch.status !== "pagado" ? (
                  <button
                    onClick={() => router.push(`/propiedades/cobros/${ch.id}/pagar`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white border-0 cursor-pointer active:scale-95 transition-transform"
                  >
                    Registrar pago
                  </button>
                ) : (
                  <button
                    onClick={() => markUnpaid(ch.id)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-500 cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
                  >
                    Desmarcar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {charges.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center">
          <div className="text-sm text-gray-400 mb-3">No hay cobros para este mes</div>
          <div className="text-xs text-gray-400 mb-4">
            Primero agregá propiedades y contratos activos, luego tocá &quot;Generar cobros&quot;
          </div>
        </div>
      )}
    </div>
  );
}
