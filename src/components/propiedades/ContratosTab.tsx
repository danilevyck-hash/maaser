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

  // Sort: expiring soon first, then by end_date
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-3.5">
        <div className="text-[13px] font-semibold text-gray-800">{contracts.length} contratos activos</div>
        <button
          onClick={() => router.push("/propiedades/contratos/nuevo")}
          disabled={!hasAvailableProps}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
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
          <div
            key={c.id}
            className={`bg-white border rounded-xl px-4 py-3.5 mb-2 ${expiring ? "border-yellow-300" : "border-gray-200"}`}
          >
            <div
              className="flex gap-3 items-center cursor-pointer"
              onClick={() => router.push(`/propiedades/contratos/editar/${c.id}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-lg shrink-0">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{c.tenant_name}</div>
                  {expiring ? (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 shrink-0 ml-2">
                      Vence en {d} días
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0 ml-2">
                      Activo
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{propName} · {propType}</div>
                {expiring ? (
                  <div className="text-xs font-medium mt-1" style={{ color: "#92400E" }}>
                    Vence {formatDateShort(c.end_date)}{d <= 7 ? " · renovar urgente" : ""}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">
                    Vence {formatDateShort(c.end_date)} · {monthsLeft} meses restantes
                  </div>
                )}
              </div>
            </div>
            {expiring && (
              <>
                <div className="h-px bg-gray-100 my-3" />
                <button
                  onClick={() => router.push(`/propiedades/contratos/nuevo?renew=${c.id}`)}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  Renovar contrato
                </button>
              </>
            )}
          </div>
        );
      })}

      {contracts.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-sm text-gray-400">
          No hay contratos activos
        </div>
      )}
    </div>
  );
}
