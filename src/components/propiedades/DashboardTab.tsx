"use client";

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

function daysSince(dateStr: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((now.getTime() - target.getTime()) / 86400000);
}

type Props = {
  properties: RentProperty[];
  contracts: RentContract[];
  charges: RentCharge[];
  currentMonth: string;
};

export default function DashboardTab({ properties, contracts, charges, currentMonth }: Props) {
  const paidCharges = charges.filter((c) => c.status === "pagado");
  const pendingCharges = charges.filter((c) => c.status === "pendiente");
  const moraCharges = charges.filter((c) => c.status === "mora");

  const totalCollected = paidCharges.reduce((s, c) => s + Number(c.amount), 0);
  const totalPending = [...pendingCharges, ...moraCharges].reduce((s, c) => s + Number(c.amount), 0);
  const totalExpected = charges.reduce((s, c) => s + Number(c.amount), 0);

  const occupiedCount = contracts.length;
  const totalProps = properties.length;

  const expiringContracts = contracts.filter((c) => {
    const d = daysUntil(c.end_date);
    return d >= 0 && d <= 30;
  });

  const unpaidCount = pendingCharges.length + moraCharges.length;
  const progressPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const recentPaid = paidCharges
    .filter((c) => c.paid_date)
    .sort((a, b) => (b.paid_date! > a.paid_date! ? 1 : -1))
    .slice(0, 3);

  const vacantProps = properties.filter(
    (p) => !contracts.some((c) => c.property_id === p.id)
  );

  const [y, m] = currentMonth.split("-");
  const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthLabel = `${monthNames[Number(m)]} ${y}`;

  return (
    <div className="p-4 space-y-4">
      {/* Alert */}
      {unpaidCount > 0 && (
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-2xl px-4 py-3 text-[15px] text-[#FF9500] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF9500] shrink-0" />
          {unpaidCount} inquilino{unpaidCount > 1 ? "s" : ""} con pago pendiente
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-[13px] text-[#8E8E93] font-medium mb-1">Ingreso mes</div>
          <div className="text-[22px] font-bold text-[#34C759] tracking-tight">{fmt(totalCollected)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-[13px] text-[#8E8E93] font-medium mb-1">Por cobrar</div>
          <div className="text-[22px] font-bold text-[#FF9500] tracking-tight">{fmt(totalPending)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-[13px] text-[#8E8E93] font-medium mb-1">Ocupacion</div>
          <div className="text-[22px] font-bold text-[#1C1C1E] tracking-tight">{occupiedCount}/{totalProps}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-[13px] text-[#8E8E93] font-medium mb-1">Contratos vencen</div>
          <div className="text-[22px] font-bold text-[#FF3B30] tracking-tight">{expiringContracts.length}</div>
        </div>
      </div>

      {/* Monthly progress */}
      <div className="text-[15px] font-semibold text-[#1C1C1E] mb-1">Cobros del mes</div>
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="text-[13px] text-[#8E8E93] mb-2">
          {fmt(totalCollected)} de {fmt(totalExpected)} · {monthLabel}
        </div>
        <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full bg-[#34C759] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-col gap-2">
          {paidCharges.map((ch) => (
            <div key={ch.id} className="flex justify-between items-center text-[15px]">
              <span className="text-[#1C1C1E]">{ch.tenant_name}</span>
              <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759]">
                {fmt(Number(ch.amount))}
              </span>
            </div>
          ))}
          {(pendingCharges.length > 0 || moraCharges.length > 0) && <div className="h-px bg-[#F2F2F7]" />}
          {pendingCharges.map((ch) => (
            <div key={ch.id} className="flex justify-between items-center text-[15px]">
              <span className="text-[#1C1C1E]">{ch.tenant_name}</span>
              <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF3B30]/10 text-[#FF3B30]">
                {fmt(Number(ch.amount))} pendiente
              </span>
            </div>
          ))}
          {moraCharges.map((ch) => (
            <div key={ch.id} className="flex justify-between items-center text-[15px]">
              <span className="text-[#1C1C1E]">{ch.tenant_name}</span>
              <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500]">
                {fmt(Number(ch.amount))} mora
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="text-[15px] font-semibold text-[#1C1C1E] mb-1">Actividad reciente</div>
      {recentPaid.map((ch) => {
        const prop = ch.property;
        const d = ch.paid_date ? daysSince(ch.paid_date) : 0;
        const ago = d === 0 ? "hoy" : d === 1 ? "hace 1 dia" : `hace ${d} dias`;
        return (
          <div key={ch.id} className="bg-white rounded-2xl shadow-sm px-4 py-3.5 mb-2">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-medium text-[#1C1C1E]">{ch.tenant_name} pago {fmt(Number(ch.amount))}</div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759]">Pagado</span>
            </div>
            <div className="text-[13px] text-[#8E8E93] mt-1">{prop?.name || ""} · {ago}</div>
          </div>
        );
      })}
      {expiringContracts.map((ct) => {
        const d = daysUntil(ct.end_date);
        return (
          <div key={ct.id} className="bg-white rounded-2xl shadow-sm px-4 py-3.5 mb-2">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-medium text-[#1C1C1E]">Contrato {ct.property?.name || ""}</div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500]">
                Vence en {d}d
              </span>
            </div>
            <div className="text-[13px] text-[#8E8E93] mt-1">{ct.tenant_name} · requiere renovacion</div>
          </div>
        );
      })}
      {vacantProps.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl shadow-sm px-4 py-3.5 mb-2">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-medium text-[#1C1C1E]">{p.name} vacia</div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">Sin inquilino</span>
          </div>
          <div className="text-[13px] text-[#8E8E93] mt-1">Desocupada · {fmt(Number(p.rent_amount))}/mes</div>
        </div>
      ))}
      {recentPaid.length === 0 && expiringContracts.length === 0 && vacantProps.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-6 text-center text-[13px] text-[#8E8E93]">
          Sin actividad reciente
        </div>
      )}
    </div>
  );
}
