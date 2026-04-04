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

  // Recent activity: paid charges + expiring contracts + vacant properties
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
    <div className="p-4 pt-4">
      {/* Alert */}
      {unpaidCount > 0 && (
        <div className="bg-amber-50 border border-yellow-300 rounded-lg px-3.5 py-3 text-sm text-amber-800 flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          {unpaidCount} inquilino{unpaidCount > 1 ? "s" : ""} con pago pendiente este mes
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-sm text-gray-400 mb-1.5 font-medium">Ingreso este mes</div>
          <div className="text-2xl font-semibold text-emerald-700 tracking-tight">{fmt(totalCollected)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-sm text-gray-400 mb-1.5 font-medium">Por cobrar</div>
          <div className="text-2xl font-semibold tracking-tight" style={{ color: "#B45309" }}>{fmt(totalPending)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-sm text-gray-400 mb-1.5 font-medium">Ocupación</div>
          <div className="text-2xl font-semibold text-gray-900 tracking-tight">{occupiedCount}/{totalProps}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-sm text-gray-400 mb-1.5 font-medium">Contratos vencen</div>
          <div className="text-2xl font-semibold text-red-700 tracking-tight">{expiringContracts.length}</div>
        </div>
      </div>

      {/* Monthly progress */}
      <div className="text-base font-semibold text-gray-800 mb-2.5">Cobros del mes</div>
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 mb-5">
        <div className="text-sm text-gray-400 mb-1.5">
          {fmt(totalCollected)} de {fmt(totalExpected)} cobrados · {monthLabel}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full my-2.5 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-col gap-2.5">
          {paidCharges.map((ch) => (
            <div key={ch.id} className="flex justify-between items-center text-sm">
              <span>{ch.tenant_name}</span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                {fmt(Number(ch.amount))}
              </span>
            </div>
          ))}
          {(pendingCharges.length > 0 || moraCharges.length > 0) && (
            <div className="h-px bg-gray-100 my-0.5" />
          )}
          {pendingCharges.map((ch) => (
            <div key={ch.id} className="flex justify-between items-center text-sm">
              <span>{ch.tenant_name}</span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700">
                {fmt(Number(ch.amount))} pendiente
              </span>
            </div>
          ))}
          {moraCharges.map((ch) => (
            <div key={ch.id} className="flex justify-between items-center text-sm">
              <span>{ch.tenant_name}</span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800">
                {fmt(Number(ch.amount))} mora
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="text-base font-semibold text-gray-800 mb-2.5">Actividad reciente</div>
      {recentPaid.map((ch) => {
        const prop = ch.property;
        const d = ch.paid_date ? daysSince(ch.paid_date) : 0;
        const ago = d === 0 ? "hoy" : d === 1 ? "hace 1 día" : `hace ${d} días`;
        return (
          <div key={ch.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-2">
            <div className="flex items-center justify-between">
              <div className="text-base font-medium text-gray-900">{ch.tenant_name} pagó {fmt(Number(ch.amount))}</div>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Pagado</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">{prop?.name || ""} · {ago}</div>
          </div>
        );
      })}
      {expiringContracts.map((ct) => {
        const d = daysUntil(ct.end_date);
        return (
          <div key={ct.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-2">
            <div className="flex items-center justify-between">
              <div className="text-base font-medium text-gray-900">Contrato {ct.property?.name || ""}</div>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800">
                Vence en {d}d
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1">{ct.tenant_name} · requiere renovación</div>
          </div>
        );
      })}
      {vacantProps.map((p) => (
        <div key={p.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-2">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium text-gray-900">{p.name} vacía</div>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">Sin inquilino</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">Desocupada · {fmt(Number(p.rent_amount))}/mes</div>
        </div>
      ))}
      {recentPaid.length === 0 && expiringContracts.length === 0 && vacantProps.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-6 mb-2 text-center text-sm text-gray-400">
          Sin actividad reciente
        </div>
      )}
    </div>
  );
}
