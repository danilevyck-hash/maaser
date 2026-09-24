/**
 * El único aviso de la pantalla: un contrato que vence pronto.
 *
 * Una sola línea, 60 días antes, y se va sola al vencer o al cambiar la fecha.
 * Nada de ámbar, nada de «sin anotar», nada de contar lo que nadie pidió.
 */

import { daysBetweenISO } from "@/lib/propiedades-pagos";
import { listaDeNombres, nombreMes } from "./mes-en-palabras";
import { primerNombre } from "./nombre";
import type { ContratoLeido } from "./lista-mes";

export const DIAS_DE_AVISO = 60;

export function contratosPorVencer(input: {
  contratos: ContratoLeido[];
  hoy: string;
  dias?: number;
}): ContratoLeido[] {
  const { contratos, hoy } = input;
  const dias = input.dias ?? DIAS_DE_AVISO;
  return contratos
    .filter((c) => c.active)
    .filter((c) => {
      const faltan = daysBetweenISO(hoy, c.end_date);
      return faltan >= 0 && faltan <= dias;
    })
    .sort((a, b) => (a.end_date < b.end_date ? -1 : a.end_date > b.end_date ? 1 : 0));
}

/** «El contrato de Sebastián vence en marzo. También el de Moisés y Ana María.» */
export function avisoDeContratos(input: {
  contratos: ContratoLeido[];
  hoy: string;
  dias?: number;
}): string | null {
  const porVencer = contratosPorVencer(input);
  if (porVencer.length === 0) return null;

  const primero = porVencer[0];
  const mes = nombreMes(primero.end_date.slice(0, 7), input.hoy.slice(0, 4));
  let texto = `El contrato de ${primerNombre(primero.tenant_name)} vence en ${mes}.`;

  const resto = porVencer.slice(1).map((c) => primerNombre(c.tenant_name));
  if (resto.length > 0) texto += ` También el de ${listaDeNombres(resto)}.`;
  return texto;
}
