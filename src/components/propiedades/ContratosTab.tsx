"use client";

import { useRouter } from "next/navigation";
import type { RentProperty, RentContract } from "@/lib/propiedades-types";
import { describeContractEnd, fmtMoney } from "@/lib/propiedades-pagos";

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  contracts: RentContract[];
  properties: RentProperty[];
  today: string;
};

export default function ContratosTab({ contracts, properties, today }: Props) {
  const router = useRouter();

  const rows = contracts
    .map((c) => ({ contract: c, end: describeContractEnd(c.end_date, today) }))
    .sort((a, b) => a.end.days - b.end.days);

  const vencidos = rows.filter((r) => r.end.expired).length;
  const porVencer = rows.filter((r) => r.end.expiringSoon).length;

  const ocupadas = new Set(
    contracts.filter((c) => c.start_date <= today && c.end_date >= today).map((c) => c.property_id),
  );
  const hasAvailableProps = properties.some((p) => !ocupadas.has(p.id));

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[#1C1C1E]">
            {ocupadas.size} de {properties.length} alquiladas
          </div>
          <div className="text-[13px] text-[#8E8E93]">
            {vencidos > 0 && `${vencidos} ${vencidos === 1 ? "vencido" : "vencidos"}`}
            {vencidos > 0 && porVencer > 0 && " · "}
            {porVencer > 0 && `${porVencer} por vencer`}
            {vencidos === 0 && porVencer === 0 && "Todos al día"}
          </div>
        </div>
        <button
          onClick={() => router.push("/propiedades/contratos/nuevo")}
          disabled={!hasAvailableProps}
          className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50 shrink-0"
        >
          + Nuevo
        </button>
      </div>

      {rows.map(({ contract: c, end }) => {
        const propName = c.property?.name || "";
        const alerta = end.expired || end.expiringSoon;
        const badge = end.expired
          ? { bg: "bg-[#FF3B30]/10 text-[#D70015]", label: "Vencido" }
          : end.expiringSoon
            ? { bg: "bg-[#FF9500]/10 text-[#B36A00]", label: "Por vencer" }
            : { bg: "bg-[#34C759]/10 text-[#0F9D3A]", label: "Activo" };

        return (
          <div
            key={c.id}
            className={`bg-white rounded-2xl shadow-sm px-4 py-3.5 ${
              end.expired ? "border border-[#FF3B30]/40" : end.expiringSoon ? "border border-[#FF9500]/30" : ""
            }`}
          >
            <div
              className="flex gap-3 items-start cursor-pointer"
              onClick={() => router.push(`/propiedades/contratos/editar/${c.id}`)}
            >
              <div className="w-11 h-11 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-lg shrink-0">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[15px] font-medium text-[#1C1C1E] break-words min-w-0">{c.tenant_name}</div>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.bg} shrink-0`}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-[13px] text-[#8E8E93] mt-0.5 break-words">
                  {propName} · {fmtMoney(Number(c.rent_amount))}/mes
                </div>
                <div
                  className={`text-[13px] mt-1 font-medium ${
                    end.expired ? "text-[#D70015]" : end.expiringSoon ? "text-[#B36A00]" : "text-[#8E8E93]"
                  }`}
                >
                  {end.text} · {formatDateShort(c.end_date)}
                </div>
              </div>
            </div>
            {alerta && (
              <>
                <div className="h-px bg-[#F2F2F7] my-3" />
                <button
                  onClick={() => router.push(`/propiedades/contratos/nuevo?renew=${c.id}`)}
                  className="w-full min-h-[48px] py-2.5 rounded-xl text-[16px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
                >
                  Renovar contrato
                </button>
              </>
            )}
          </div>
        );
      })}

      {contracts.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center text-[15px] text-[#8E8E93]">
          No hay contratos activos
        </div>
      )}
    </div>
  );
}
