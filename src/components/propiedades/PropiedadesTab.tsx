"use client";

import { useRouter } from "next/navigation";
import type { RentProperty, RentContract, RentCharge } from "@/lib/propiedades-types";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysUntil(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

type Props = {
  properties: RentProperty[];
  contracts: RentContract[];
  charges: RentCharge[];
  onRefresh: () => void;
};

export default function PropiedadesTab({ properties, contracts, charges }: Props) {
  const router = useRouter();

  function getStatus(p: RentProperty) {
    const contract = contracts.find((c) => c.property_id === p.id);
    if (!contract) return { label: "Vacia", color: "blue" as const, tenant: "Sin inquilino" };

    const d = daysUntil(contract.end_date);
    if (d >= 0 && d <= 30) return { label: "Vence pronto", color: "amber" as const, tenant: contract.tenant_name };

    const charge = charges.find((c) => c.property_id === p.id);
    if (charge?.status === "mora") return { label: "Mora", color: "red" as const, tenant: contract.tenant_name };
    if (charge?.status === "pendiente") return { label: "Pendiente", color: "red" as const, tenant: contract.tenant_name };

    return { label: "Al dia", color: "green" as const, tenant: contract.tenant_name };
  }

  const badgeColors = {
    green: "bg-[#34C759]/10 text-[#34C759]",
    red: "bg-[#FF3B30]/10 text-[#FF3B30]",
    amber: "bg-[#FF9500]/10 text-[#FF9500]",
    blue: "bg-[#007AFF]/10 text-[#007AFF]",
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[15px] font-semibold text-[#1C1C1E]">{properties.length} propiedades</div>
        <button
          onClick={() => router.push("/propiedades/nueva")}
          className="min-h-[44px] px-4 py-2.5 rounded-xl text-[15px] font-semibold bg-[#007AFF] text-white border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
        >
          + Agregar
        </button>
      </div>

      {properties.map((p) => {
        const status = getStatus(p);
        const shortTenant = status.tenant.length > 15 ? status.tenant.split(" ")[0] + " " + (status.tenant.split(" ")[1]?.[0] || "") + "." : status.tenant;
        return (
          <div
            key={p.id}
            className="bg-white rounded-2xl shadow-sm px-4 py-3.5 min-h-[60px] cursor-pointer active:bg-[#F2F2F7] transition-colors"
            onClick={() => router.push(`/propiedades/editar/${p.id}`)}
          >
            <div className="flex gap-3 items-center">
              <div className="w-[42px] h-[42px] rounded-xl bg-[#F2F2F7] flex items-center justify-center text-xl shrink-0">
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-medium text-[#1C1C1E] truncate">{p.name}</div>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeColors[status.color]} shrink-0 ml-2`}>
                    {status.label}
                  </span>
                </div>
                <div className="text-[13px] text-[#8E8E93] mt-0.5">
                  {p.location}{p.location && " · "}{p.type === "comercial" ? "Comercial" : "Residencial"} · {shortTenant}
                </div>
                <div className="text-[15px] font-semibold text-[#1C1C1E] mt-1">{fmt(Number(p.rent_amount))}/mes</div>
              </div>
            </div>
          </div>
        );
      })}

      {properties.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center text-[13px] text-[#8E8E93]">
          No hay propiedades. Agrega tu primera propiedad.
        </div>
      )}
    </div>
  );
}
