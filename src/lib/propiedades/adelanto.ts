/**
 * «Pagó varios meses por adelantado»: se pregunta UN dato, hasta qué mes.
 *
 * De ahí sale la lista de meses que hay que marcar. Un mes que YA está pagado
 * no se vuelve a escribir: nunca se duplica un cobro.
 */

import { addMonths, monthsBetween } from "@/lib/propiedades-pagos";
import { cobrosPorMes, estadoDelMes, type CobroLeido } from "./estado-mes";

export type PasoDeAdelanto = {
  mes: string;
  /** Si ya hay fila de ese mes se corrige; si no, se crea. */
  cobroId?: number;
  monto: number;
};

/** Tope de seguridad: nadie paga más de tres años por adelantado. */
export const MESES_MAXIMOS_DE_ADELANTO = 36;

export function pasosDelAdelanto(input: {
  desde: string;
  hasta: string;
  cobros: CobroLeido[];
  montoDeMes: (mes: string) => number;
}): PasoDeAdelanto[] {
  const { desde, hasta, cobros, montoDeMes } = input;
  const cuantos = monthsBetween(desde, hasta);
  if (cuantos < 0) return [];

  const porMes = cobrosPorMes(cobros);
  const pasos: PasoDeAdelanto[] = [];
  for (let i = 0; i <= Math.min(cuantos, MESES_MAXIMOS_DE_ADELANTO); i++) {
    const mes = addMonths(desde, i);
    const cobro = porMes.get(mes);
    if (estadoDelMes(cobro) === "pagado") continue;
    pasos.push({ mes, cobroId: cobro?.id, monto: montoDeMes(mes) });
  }
  return pasos;
}

/** Los meses que se le ofrecen: el siguiente al que se mira, y doce más. */
export function mesesParaElegir(mes: string, cuantos = 12): string[] {
  const lista: string[] = [];
  for (let i = 1; i <= cuantos; i++) lista.push(addMonths(mes, i));
  return lista;
}
