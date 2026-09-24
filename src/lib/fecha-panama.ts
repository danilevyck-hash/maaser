// La fecha de Panamá, siempre.
//
// Panamá es UTC−5 fijo: no tiene horario de verano, así que la conversión es
// una resta, no una tabla de zonas horarias.
//
// Por qué existe este archivo: la app ponía la fecha de "hoy" con
// `new Date().toISOString()`, que es la hora de Londres. Después de las 7 de la
// noche de Panamá eso ya es el día siguiente, y 12 donaciones quedaron
// guardadas con la fecha de mañana. Todo lo que diga "hoy" pasa por aquí.

export const PANAMA_MINUTOS_UTC = -5 * 60;

/** AAAA-MM-DD del momento dado, en hora de Panamá. */
export function fechaPanamaISO(momento: Date = new Date()): string {
  const corrido = new Date(momento.getTime() + PANAMA_MINUTOS_UTC * 60_000);
  const anio = corrido.getUTCFullYear();
  const mes = String(corrido.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(corrido.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** El día de hoy en Panamá, como AAAA-MM-DD. */
export function hoyPanamaISO(): string {
  return fechaPanamaISO(new Date());
}
