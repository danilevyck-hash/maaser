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

/**
 * 🔴 `SIMPLE` (6-oct-2026): Maaser con palabras en vez de íconos, pensado para
 * un señor de 70 años que no es de computadoras.
 *
 * Daniel: «No quiero los 3 puntitos, que sea más intuitivo, más fácil de usar
 * para un señor de 70 años panameño» · «Revisá todo, cada botón, cada
 * pestaña, el workflow».
 *
 * Qué cambia:
 *  · Se va el «···» de las DOS pantallas. Ordenar pasa a tres palabras a la
 *    vista; «Ver por beneficiario» y «Exportar» vuelven a ser renglones.
 *  · El botón negro de Anotar deja de ser dos botones pegados: «Listo» ocupa
 *    todo el ancho y el día se cambia en su propio renglón del formulario.
 *  · El año se lee como una lista de meses con palabras, no como barras con
 *    rótulos de 9 px.
 *  · Nada por debajo de 14 px, ningún ícono solo, y el buscador siempre a la
 *    vista.
 *
 * ⚪ APAGADO. `NEXT_PUBLIC_MAASER_SIMPLE=1` lo prende; sin eso la pantalla es
 * BYTE por BYTE la de hoy. El candado `maaser-simple.test.tsx` cuida las dos
 * posiciones.
 */
export const SIMPLE = process.env.NEXT_PUBLIC_MAASER_SIMPLE === "1";
