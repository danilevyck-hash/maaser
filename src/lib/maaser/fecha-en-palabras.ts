// Las fechas, dichas como las dice una persona.
//
// En la lista: "hoy", "ayer" o "15 sep". En el botón de guardar, la fecha
// completa: "hoy 23 de septiembre".
//
// "Hoy" SIEMPRE llega de afuera (hoyPanamaISO): aquí no se llama a new Date().

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "2026-09-12" → "12 de septiembre". */
export function diaYMesLargo(fechaISO: string): string {
  const dia = parseInt((fechaISO || "").slice(8, 10), 10);
  const mes = parseInt((fechaISO || "").slice(5, 7), 10);
  if (!dia || !mes) return fechaISO || "";
  return `${dia} de ${MESES_LARGOS[mes - 1]}`;
}

/** "2026-09-15" → "15 sep". */
export function diaYMesCorto(fechaISO: string): string {
  const dia = parseInt((fechaISO || "").slice(8, 10), 10);
  const mes = parseInt((fechaISO || "").slice(5, 7), 10);
  if (!dia || !mes) return fechaISO || "";
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

/** El día anterior, como AAAA-MM-DD. Sin tocar el reloj de nadie. */
export function diaAntes(fechaISO: string): string {
  const t = Date.parse(`${fechaISO}T00:00:00.000Z`);
  if (!Number.isFinite(t)) return fechaISO;
  return new Date(t - 86_400_000).toISOString().slice(0, 10);
}

/** Lo que dice la fila de la lista: "hoy", "ayer" o "15 sep". */
export function fechaDeLaFila(fechaISO: string, hoyISO: string): string {
  if (fechaISO === hoyISO) return "hoy";
  if (fechaISO === diaAntes(hoyISO)) return "ayer";
  return diaYMesCorto(fechaISO);
}

/** Lo que dice el botón negro: "hoy 23 de septiembre" o "2 de abril". */
export function fechaDelBoton(fechaISO: string, hoyISO: string): string {
  const largo = diaYMesLargo(fechaISO);
  return fechaISO === hoyISO ? `hoy ${largo}` : largo;
}
