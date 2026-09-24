/**
 * Un mes solo tiene tres estados, y dos de ellos los decide PAPÁ.
 *
 * - pagado    → ✓ verde. Él tocó el círculo.
 * - no_pago   → ✗ rojo. Él dijo «no ha pagado». Esto, y solo esto, es deuda.
 * - sin_marcar → círculo vacío. Nadie dijo nada todavía.
 *
 * 🔴 Los 'mora' y 'pendiente' viejos NO son deuda: son meses que el sistema
 * creó solo, sin que nadie los mirara. Daniel, 24-sep-2026: «el usuario debe
 * llevar la cuenta, no tú». Por eso caen en 'sin_marcar'.
 */

export const ESTADO_PAGADO = "pagado";
/** El estado nuevo. Ver supabase/20260924-rent-charges-no-pago.sql. */
export const ESTADO_NO_PAGO = "no_pago";

export type EstadoMes = "pagado" | "no_pago" | "sin_marcar";

export type CobroLeido = {
  id?: number;
  month: string;
  amount: number | string;
  status: string;
  paid_date?: string | null;
};

export function estadoDelMes(cobro: CobroLeido | null | undefined): EstadoMes {
  if (!cobro) return "sin_marcar";
  if (cobro.status === ESTADO_PAGADO) return "pagado";
  if (cobro.status === ESTADO_NO_PAGO) return "no_pago";
  return "sin_marcar";
}

/** El cobro de cada mes, uno por mes (si hubiera dos, gana el pagado). */
export function cobrosPorMes(cobros: CobroLeido[]): Map<string, CobroLeido> {
  const mapa = new Map<string, CobroLeido>();
  for (const cobro of cobros) {
    const previo = mapa.get(cobro.month);
    if (!previo || (estadoDelMes(previo) !== "pagado" && estadoDelMes(cobro) === "pagado")) {
      mapa.set(cobro.month, cobro);
    }
  }
  return mapa;
}
