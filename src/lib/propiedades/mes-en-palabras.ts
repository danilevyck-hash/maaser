/**
 * Los meses como papá los dice: «agosto», «julio y agosto», «Septiembre».
 *
 * Nada de fechas ni de zonas horarias aquí: entra 'AAAA-MM' y sale una palabra.
 */

export const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const MESES_CORTOS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** '2026-08' -> 'agosto'. Con un año distinto al de referencia: 'agosto 2025'. */
export function nombreMes(mes: string, anioDeReferencia?: string): string {
  const anio = mes.slice(0, 4);
  const indice = Number(mes.slice(5, 7)) - 1;
  const nombre = MESES_ES[indice] ?? mes;
  const referencia = anioDeReferencia ? anioDeReferencia.slice(0, 4) : anio;
  return anio === referencia ? nombre : `${nombre} ${anio}`;
}

/** Igual, con la primera letra grande: 'Agosto'. */
export function nombreMesCap(mes: string, anioDeReferencia?: string): string {
  const texto = nombreMes(mes, anioDeReferencia);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** ['2026-07','2026-08'] -> 'julio y agosto'. Uno solo -> 'agosto'. */
export function listaDeMeses(meses: string[], anioDeReferencia?: string): string {
  const nombres = meses.map((m) => nombreMes(m, anioDeReferencia));
  if (nombres.length === 0) return "";
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** ['Moisés','Ana María','Javed'] -> 'Moisés, Ana María y Javed'. */
export function listaDeNombres(nombres: string[]): string {
  if (nombres.length === 0) return "";
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** '2026-09-03' -> '3 de septiembre'. */
export function diaEnPalabras(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  const indice = Number(mes) - 1;
  return `${Number(dia)} de ${MESES_ES[indice] ?? mes}`;
}

/** '2021-11-30' -> '30 nov 2021'. */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${Number(dia)} ${MESES_CORTOS_ES[Number(mes) - 1] ?? mes} ${anio}`;
}
