/**
 * Marcar un mes: pagado o «no pagó». Una sola puerta para las dos pantallas.
 *
 * 🔴 Los cobros de un mes se crean SOLO al marcarlos. Abrir la pantalla no
 * escribe una sola fila (hasta el 23-sep-2026 entrar creaba siete).
 *
 * 🔴 Falla ABIERTA: si la base todavía no acepta el estado 'no_pago'
 * (supabase/20260924-rent-charges-no-pago.sql, la aplica Daniel), no se rompe
 * nada: se devuelve `faltaLaBase` y la pantalla lo dice en una línea.
 */

import { ESTADO_NO_PAGO, ESTADO_PAGADO } from "./estado-mes";

export type MarcaDeMes = {
  propiedadId: number;
  contratoId?: number | null;
  inquilinoGuardado: string;
  mes: string;
  monto: number;
  cobroId?: number;
};

export type ResultadoDeMarca = {
  ok: boolean;
  faltaLaBase?: boolean;
  error?: string;
};

const SENALES_DE_QUE_FALTA = /check constraint|constraint|no_pago|invalid input value/i;

async function mandar(url: string, method: "POST" | "PUT", cuerpo: unknown): Promise<ResultadoDeMarca> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    const mensaje = String((data as { error?: string }).error ?? "");
    return { ok: false, faltaLaBase: SENALES_DE_QUE_FALTA.test(mensaje), error: mensaje };
  } catch {
    return { ok: false, error: "Sin conexión" };
  }
}

export async function marcarMes(
  marca: MarcaDeMes,
  estado: "pagado" | "no_pago",
  hoy: string,
): Promise<ResultadoDeMarca> {
  const status = estado === "pagado" ? ESTADO_PAGADO : ESTADO_NO_PAGO;
  const paid_date = estado === "pagado" ? hoy : null;

  if (marca.cobroId) {
    return mandar("/api/propiedades/charges", "PUT", { id: marca.cobroId, status, paid_date });
  }
  return mandar("/api/propiedades/charges", "POST", {
    property_id: marca.propiedadId,
    contract_id: marca.contratoId ?? null,
    tenant_name: marca.inquilinoGuardado,
    month: marca.mes,
    amount: marca.monto,
    status,
    due_date: `${marca.mes}-01`,
    paid_date,
  });
}

/** Varios meses de un saque (el adelanto). Se corta al primer tropiezo. */
export async function marcarVariosMeses(
  marcas: MarcaDeMes[],
  estado: "pagado" | "no_pago",
  hoy: string,
): Promise<ResultadoDeMarca> {
  for (const marca of marcas) {
    const resultado = await marcarMes(marca, estado, hoy);
    if (!resultado.ok) return resultado;
  }
  return { ok: true };
}

export const AVISO_FALTA_LA_BASE =
  "No se pudo marcar «no ha pagado»: falta un cambio chico en la base. Lo demás sigue funcionando.";
