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
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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
    pagado: "bg-[#34C759]/10 text-[#34C759]",
    pendiente: "bg-[#FF3B30]/10 text-[#FF3B30]",
    mora: "bg-[#FF9500]/10 text-[#FF9500]",
  };

  const badgeConfig = {
    pagado: { bg: "bg-[#34C759]/10 text-[#34C759]", label: "Pagado" },
    pendiente: { bg: "bg-[#FF3B30]/10 text-[#FF3B30]", label: "Pendiente" },
    mora: { bg: "bg-[#FF9500]/10 text-[#FF9500]", label: "" },
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[15px] font-semibold text-[#1C1C1E]">Cobros · {monthLabel}</div>
        <button
          onClick={generateCharges}
          disabled={generating}
          className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50"
        >
          {generating ? "Generando..." : "Generar cobros"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((ch) => {
          const initials = getInitials(ch.tenant_name);
          const propName = ch.property?.name || "";

          let subText = propName;
          if (ch.status === "pagado" && ch.paid_date) {
            const [, pm, pd] = ch.paid_date.split("-");
            const monthAbbr = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
            subText += ` · pago el ${Number(pd)} ${monthAbbr[Number(pm)]}`;
          } else if (ch.status === "pendiente") {
            const d = daysSince(ch.due_date);
            if (d > 0) subText += ` · vencio hace ${d} dias`;
          } else if (ch.status === "mora") {
            const d = daysSince(ch.due_date);
            subText += ` · ${d} dias de mora`;
          }

          const badge = badgeConfig[ch.status];
          const badgeLabel = ch.status === "mora" ? `${daysSince(ch.due_date)} dias mora` : badge.label;

          return (
            <div key={ch.id} className="bg-white rounded-2xl shadow-sm px-4 py-3.5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-[44px] h-[44px] rounded-full ${initialsColors[ch.status]} text-[13px] font-semibold flex items-center justify-center shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[#1C1C1E]">{ch.tenant_name}</div>
                  <div className="text-[13px] text-[#8E8E93] mt-0.5">{subText}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.bg} shrink-0`}>
                  {badgeLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-[20px] font-bold tracking-tight ${
                  ch.status === "pagado" ? "text-[#1C1C1E]" :
                  ch.status === "pendiente" ? "text-[#FF3B30]" : "text-[#FF9500]"
                }`}>
                  {fmt(Number(ch.amount))}
                </div>
                {ch.status !== "pagado" ? (
                  <button
                    onClick={() => router.push(`/propiedades/cobros/${ch.id}/pagar`)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#34C759] text-white border-0 cursor-pointer active:bg-[#2da44e] transition-colors"
                  >
                    Registrar pago
                  </button>
                ) : (
                  <button
                    onClick={() => markUnpaid(ch.id)}
                    disabled={saving}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-medium border border-[#C6C6C8] bg-white text-[#8E8E93] cursor-pointer active:bg-[#F2F2F7] transition-colors disabled:opacity-50"
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
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center">
          <div className="text-[13px] text-[#8E8E93] mb-3">No hay cobros para este mes</div>
          <div className="text-[11px] text-[#8E8E93]">
            Agrega propiedades y contratos, luego toca &quot;Generar cobros&quot;
          </div>
        </div>
      )}
    </div>
  );
}
