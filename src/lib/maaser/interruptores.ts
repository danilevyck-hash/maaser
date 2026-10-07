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
 * ✅ `AUDITORIA` (6-oct-2026): lo que salió de recorrer la app entera pantalla
 * por pantalla, pensando en un señor de 70 años en Panamá.
 *
 * **PRENDIDO el 6-oct-2026**, con el sí de Daniel sobre las capturas: «lo
 * demás de la auditoría está aprobado: empezá a aplicarlo».
 *
 * Para apagarlo: `NEXT_PUBLIC_MAASER_AUDITORIA=0` en Vercel y volver a
 * publicar — las pantallas vuelven a ser BYTE por BYTE las de antes, sin tocar
 * código. Candado: `maaser-auditoria.test.tsx` (las dos posiciones).
 *
 * Qué cambia:
 *  · **Buscar encuentra por número de cheque.** Buscar era solo por nombre:
 *    escribir «2936» no encontraba nada, y el número de cheque es lo que él
 *    usa para cuadrar con el banco (123 de 266 donaciones lo llevan).
 *  · **Manda el monto.** La fila de una donación dice el monto grande; a quién
 *    y por qué bajan a la segunda línea, en gris y más chicos. El número de
 *    cheque va en negro, con la fecha.
 *  · **El gasto anual se cambia desde la pantalla**, no en la base.
 *  · **«Guardar los cambios»** al cambiar una donación, y la hoja de borrar
 *    dice QUÉ borra.
 *  · **«Cuánto le diste a cada persona»** tiene un solo «‹», su título y su
 *    flecha en cada fila.
 */
export const AUDITORIA = process.env.NEXT_PUBLIC_MAASER_AUDITORIA !== "0";

/**
 * 🔴 `MESES_POR_LLEGAR` (7-oct-2026): un año recién empezado son trece
 * renglones iguales de «No diste nada este mes», uno por cada mes del año
 * hebreo, incluidos los que todavía no llegaron. Eso es ruido: nadie pudo
 * haber dado nada en un mes que no existe aún.
 *
 * Los meses que YA pasaron sin donación siguen renglón por renglón: ahí el
 * cero es información de verdad. Los del final del año que no llegaron se
 * juntan en UNA línea gris.
 *
 * ✅ **PRENDIDO el 7-oct-2026 con su sí** («aprobó la línea única»):
 * `NEXT_PUBLIC_MAASER_MESES=1` en Vercel producción. **Para apagarlo:
 * borrar la variable o ponerla en `0`** y volver a publicar — la pantalla
 * vuelve a ser BYTE por BYTE la de antes, sin tocar código. Candado:
 * `maaser-meses-por-llegar.test.tsx` (las dos posiciones).
 */
export const MESES_POR_LLEGAR = process.env.NEXT_PUBLIC_MAASER_MESES === "1";
