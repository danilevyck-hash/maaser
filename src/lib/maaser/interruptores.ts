/**
 * Los interruptores de Maaser. Apagados = la pantalla de siempre.
 *
 * 🔴 `HISTORIAL_ORDENADO` (6-oct-2026): el historial por año desde la línea
 * del pie, el número de cheque a la vista en la lista, y «ordenar por». Nace
 * en `false`: con el interruptor apagado la pantalla es BYTE por BYTE la de
 * hoy, y el candado `maaser-historial.test.tsx` lo cuida.
 *
 * Se prende sin tocar código, con la variable de entorno
 * `NEXT_PUBLIC_MAASER_HISTORIAL=1` (en Vercel, o en .env.local para verlo).
 */

export const HISTORIAL_ORDENADO =
  process.env.NEXT_PUBLIC_MAASER_HISTORIAL === "1";
