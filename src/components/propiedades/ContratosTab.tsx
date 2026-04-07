"use client";

import { useRouter } from "next/navigation";
import type { RentProperty, RentContract } from "@/lib/propiedades-types";

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  contracts: RentContract[];
  properties: RentProperty[];
  onRefresh: () => void;
};

export default function ContratosTab({ contracts, properties }: Props) {
  const router = useRouter();

  const occupiedIds = new Set(contracts.map((c) => c.property_id));
  const hasAvailableProps = properties.some((p) => !occupiedIds.has(p.id));

  const sorted = [...contracts].sort((a, b) => {
    const da = daysUntil(a.end_date);
    const db = daysUntil(b.end_date);
    const aExpiring = da >= 0 && da <= 30;
    const bExpiring = db >= 0 && db <= 30;
    if (aExpiring && !bExpiring) return -1;
    if (!aExpiring && bExpiring) return 1;
    return da - db;
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[15px] font-semibold text-[#1C1C1E]">{contracts.length} contratos activos</div>
        <button
          onClick={() => router.push("/propiedades/contratos/nuevo")}
          disabled={!hasAvailableProps}
          className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50"
        >
          + Nuevo
        </button>
      </div>

      {sorted.map((c) => {
        const d = daysUntil(c.end_date);
        const expiring = d >= 0 && d <= 30;
        const propName = c.property?.name || "";
        const propType = c.property?.type === "comercial" ? "Comercial" : "Residencial";
        const todayStr = new Date().toISOString().split("T")[0];
        const monthsLeft = monthsBetween(todayStr.slice(0, 7), c.end_date.slice(0, 7));

        return (
          <div key={c.id} className={`bg-white rounded-2xl shadow-sm px-4 py-3.5 ${expiring ? "border border-[#FF9500]/30" : ""}`}>
            <div
              className="flex gap-3 items-center cursor-pointer"
              onClick={() => router.push(`/propiedades/contratos/editar/${c.id}`)}
            >
              <div className="w-11 h-11 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-lg shrink-0">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-medium text-[#1C1C1E]">{c.tenant_name}</div>
                  {expiring ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500] shrink-0 ml-2">
                      Vence en {d} dias
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] shrink-0 ml-2">
                      Activo
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-[#8E8E93] mt-0.5">{propName} · {propType}</div>
                {expiring ? (
                  <div className="text-[13px] font-medium mt-1 text-[#FF9500]">
                    Vence {formatDateShort(c.end_date)}{d <= 7 ? " · renovar urgente" : ""}
                  </div>
                ) : (
                  <div className="text-[13px] text-[#8E8E93] mt-1">
                    Vence {formatDateShort(c.end_date)} · {monthsLeft} meses restantes
                  </div>
                )}
              </div>
            </div>
            {expiring && (
              <>
                <div className="h-px bg-[#F2F2F7] my-3" />
                <button
                  onClick={() => router.push(`/propiedades/contratos/nuevo?renew=${c.id}`)}
                  className="w-full min-h-[44px] py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
                >
                  Renovar contrato
                </button>
              </>
            )}
          </div>
        );
      })}

      {contracts.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center text-[13px] text-[#8E8E93]">
          No hay contratos activos
        </div>
      )}
    </div>
  );
}
