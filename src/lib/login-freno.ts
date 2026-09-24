// Freno de intentos del PIN.
//
// Medido el 23-sep-2026: la app contestaba 10 claves seguidas al instante.
// Probar los 10.000 PIN posibles tomaba minutos. Desde aquí, cinco fallos
// desde la misma dirección cierran la puerta 15 minutos.
//
// Módulo PURO: no toca la base ni el reloj. Quien lo llama le pasa el estado
// guardado y el momento actual.

export const MAX_FALLOS = 5;
export const VENTANA_MINUTOS = 15;

export type EstadoIntentos = {
  fallos: number;
  /** ISO del primer fallo de la racha. */
  primer_fallo_en: string;
} | null;

export type Veredicto = {
  bloqueado: boolean;
  /** Minutos que faltan para poder volver a probar. 0 si no está bloqueado. */
  minutosRestantes: number;
  /** Intentos que le quedan antes de quedar bloqueado. */
  intentosRestantes: number;
};

export function evaluarFreno(estado: EstadoIntentos, ahora: Date): Veredicto {
  const vivo = rachaViva(estado, ahora);
  if (!vivo) {
    return { bloqueado: false, minutosRestantes: 0, intentosRestantes: MAX_FALLOS };
  }
  if (vivo.fallos >= MAX_FALLOS) {
    const fin = new Date(vivo.desde.getTime() + VENTANA_MINUTOS * 60_000);
    const minutos = Math.max(1, Math.ceil((fin.getTime() - ahora.getTime()) / 60_000));
    return { bloqueado: true, minutosRestantes: minutos, intentosRestantes: 0 };
  }
  return {
    bloqueado: false,
    minutosRestantes: 0,
    intentosRestantes: MAX_FALLOS - vivo.fallos,
  };
}

/** El estado que hay que guardar después de un fallo. */
export function estadoTrasFallo(
  estado: EstadoIntentos,
  ahora: Date
): { fallos: number; primer_fallo_en: string } {
  const vivo = rachaViva(estado, ahora);
  if (!vivo) return { fallos: 1, primer_fallo_en: ahora.toISOString() };
  return { fallos: vivo.fallos + 1, primer_fallo_en: vivo.desde.toISOString() };
}

function rachaViva(
  estado: EstadoIntentos,
  ahora: Date
): { fallos: number; desde: Date } | null {
  if (!estado || !estado.primer_fallo_en) return null;
  const desde = new Date(estado.primer_fallo_en);
  if (Number.isNaN(desde.getTime())) return null;
  const vencida = ahora.getTime() - desde.getTime() >= VENTANA_MINUTOS * 60_000;
  if (vencida) return null;
  const fallos = Number(estado.fallos) || 0;
  if (fallos <= 0) return null;
  return { fallos, desde };
}
