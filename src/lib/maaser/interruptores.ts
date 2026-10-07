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
 * ✅ **PRENDIDO el 6-oct-2026**, con el sí de Daniel sobre las capturas:
 * «aplícalo y lo veo en vivo».
 *
 * Sigue siendo un interruptor: `NEXT_PUBLIC_MAASER_SIMPLE=0` lo apaga y las
 * pantallas vuelven a ser BYTE por BYTE las de antes, sin tocar código ni
 * volver a publicar. El candado `maaser-simple.test.tsx` cuida las dos
 * posiciones.
 */
export const SIMPLE = process.env.NEXT_PUBLIC_MAASER_SIMPLE !== "0";

/**
 * 🟡 `AUDITORIA` (6-oct-2026): lo que salió de recorrer la app entera pantalla
 * por pantalla, pensando en un señor de 70 años en Panamá.
 *
 * **APAGADO.** Es una PROPUESTA: se prende con el sí de Daniel sobre las
 * capturas (`NEXT_PUBLIC_MAASER_AUDITORIA=1` en Vercel). Al revés que los
 * otros dos interruptores, este nace en cero: sin la variable, la app es
 * BYTE por BYTE la de hoy.
 *
 * Qué cambia:
 *  · **Buscar encuentra por número de cheque.** Hoy buscar es solo por
 *    nombre: escribir «2936» no encuentra nada, y el número de cheque es lo
 *    que él usa para cuadrar con el banco (123 de 266 donaciones lo llevan).
 *  · **El número de cheque se ve.** En la fila va en tinta negra y en
 *    negrita, no en el gris de la fecha y la nota.
 */
export const AUDITORIA = process.env.NEXT_PUBLIC_MAASER_AUDITORIA === "1";
