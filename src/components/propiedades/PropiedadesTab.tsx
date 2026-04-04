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
    if (!contract) return { label: "Vacía", color: "blue" as const, tenant: "Sin inquilino" };

    const d = daysUntil(contract.end_date);
    if (d >= 0 && d <= 30) return { label: "Vence pronto", color: "amber" as const, tenant: contract.tenant_name };

    const charge = charges.find((c) => c.property_id === p.id);
    if (charge?.status === "mora") return { label: "Mora", color: "red" as const, tenant: contract.tenant_name };
    if (charge?.status === "pendiente") return { label: "Pendiente", color: "red" as const, tenant: contract.tenant_name };

    return { label: "Al día", color: "green" as const, tenant: contract.tenant_name };
  }

  const badgeColors = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3.5">
        <div className="text-base font-semibold text-gray-800">{properties.length} propiedades</div>
        <button
          onClick={() => router.push("/propiedades/nueva")}
          className="min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-700 text-white border-0 cursor-pointer active:scale-95 transition-transform"
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
            className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-2 min-h-[60px] cursor-pointer active:bg-gray-50"
            onClick={() => router.push(`/propiedades/editar/${p.id}`)}
          >
            <div className="flex gap-3 items-center">
              <div className="w-[42px] h-[42px] rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-base font-medium text-gray-900 truncate">{p.name}</div>
                  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeColors[status.color]} shrink-0 ml-2`}>
                    {status.label}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mt-0.5">
                  {p.location}{p.location && " · "}{p.type === "comercial" ? "Comercial" : "Residencial"} · {shortTenant}
                </div>
                <div className="text-base font-semibold text-gray-800 mt-1">{fmt(Number(p.rent_amount))}/mes</div>
              </div>
            </div>
          </div>
        );
      })}

      {properties.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center text-sm text-gray-400">
          No hay propiedades. Agregá tu primera propiedad.
        </div>
      )}
    </div>
  );
}
