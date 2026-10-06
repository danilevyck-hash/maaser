/**
 * Los interruptores de Maaser.
 *
 * 🔴 `HISTORIAL_ORDENADO` (6-oct-2026): el historial por año desde la línea
 * del pie, el número de cheque a la vista en la lista, y «ordenar por».
 *
 * ✅ **PRENDIDO el 6-oct-2026**, con el sí de Daniel sobre las capturas.
 *
 * Sigue siendo un interruptor: `NEXT_PUBLIC_MAASER_HISTORIAL=0` lo apaga y la
 * pantalla vuelve a ser BYTE por BYTE la de antes, sin tocar código ni volver
 * a publicar. El candado `maaser-historial.test.tsx` cuida las dos posiciones.
 */

export const HISTORIAL_ORDENADO =
  process.env.NEXT_PUBLIC_MAASER_HISTORIAL !== "0";
