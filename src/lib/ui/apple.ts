/**
 * El sistema visual de la app, en un solo archivo.
 *
 * Tipografía del sistema, fondo blanco, listas separadas por una raya de 1 px
 * (nunca tarjetas con sombra), un solo azul para enlaces, el botón principal
 * negro, y verde y rojo SOLO cuando significan algo (pagado · debe).
 *
 * Aquí no hay lógica: son los mismos nombres de clase para las tres pantallas,
 * para que Inicio, Maaser y Propiedades se vean como una sola app.
 */

/* ── Colores ──────────────────────────────────────────────────────── */
export const TINTA = "#1C1C1E";
export const TINTA_2 = "#6E6E73";
export const TINTA_3 = "#AEAEB2";
export const RAYA = "#E5E5EA";
export const RELLENO = "#F2F2F7";
export const AZUL = "#007AFF";
export const VERDE = "#34C759";
export const VERDE_TEXTO = "#0F6B45";
export const ROJO = "#FF3B30";
export const ROJO_TEXTO = "#C42B21";
export const ROJO_SUAVE = "#FDF1EF";
export const ROJO_RAYA = "#F0CDC6";
export const AMBAR_TEXTO = "#8A5510";
export const AMBAR_SUAVE = "#FFFBEA";
export const AMBAR_RAYA = "#F2E2A8";

/* ── Texto ────────────────────────────────────────────────────────── */
/** El nombre de la pantalla: grande y delgado, como en iOS. */
export const TITULO = "text-[34px] font-light tracking-[-0.02em] text-[#1C1C1E] leading-[1.1]";
/** El número que contesta la pantalla de un vistazo. */
export const CIFRA = "text-[44px] font-light tracking-[-0.03em] text-[#1C1C1E] leading-none tabular-nums";
export const TEXTO = "text-[17px] text-[#1C1C1E]";
export const TEXTO_FUERTE = "text-[17px] font-medium text-[#1C1C1E]";
export const TEXTO_2 = "text-[15px] text-[#6E6E73]";
export const TEXTO_3 = "text-[14px] text-[#6E6E73]";
export const MONTO = "text-[17px] text-[#1C1C1E] tabular-nums whitespace-nowrap";

/* ── Listas ───────────────────────────────────────────────────────── */
/** Una raya de 1 px arriba de cada renglón: sin tarjetas, sin sombras. */
export const RENGLON =
  "w-full flex items-center gap-4 px-5 py-3.5 min-h-[56px] text-left bg-transparent " +
  "border-x-0 border-b-0 border-t border-solid border-[#E5E5EA] cursor-pointer " +
  "active:bg-[#F2F2F7] transition-colors";
export const BLOQUE = "px-5 py-4 border-t border-[#E5E5EA]";

/* ── Botones ──────────────────────────────────────────────────────── */
export const BOTON_PRINCIPAL =
  "w-full min-h-[52px] rounded-[14px] bg-[#1C1C1E] text-white text-[17px] font-semibold " +
  "px-4 py-[15px] border-0 cursor-pointer active:opacity-80 transition-opacity disabled:opacity-40";
export const BOTON_CHICO =
  "min-h-[44px] rounded-[14px] bg-[#1C1C1E] text-white text-[15px] font-semibold px-4 " +
  "border-0 cursor-pointer active:opacity-80 transition-opacity disabled:opacity-40";
export const BOTON_BORDE =
  "min-h-[44px] rounded-[14px] border border-[#E5E5EA] bg-white text-[#007AFF] text-[17px] px-4 " +
  "cursor-pointer active:bg-[#F2F2F7] transition-colors disabled:opacity-40";
export const BOTON_BORDE_ANCHO = `w-full ${BOTON_BORDE} min-h-[52px]`;
export const ENLACE =
  "text-[#007AFF] text-[17px] bg-transparent border-0 cursor-pointer p-0 no-underline";
export const ENLACE_CHICO = "text-[#007AFF] text-[15px] bg-transparent border-0 cursor-pointer p-0";

/* ── Fichas que se eligen (montos, meses, forma de pago) ──────────── */
export const FICHA =
  "min-h-[44px] rounded-[14px] px-4 text-[15px] border-0 cursor-pointer transition-colors " +
  "bg-[#F2F2F7] text-[#1C1C1E] tabular-nums";
export const FICHA_ELEGIDA =
  "min-h-[44px] rounded-[14px] px-4 text-[15px] border-0 cursor-pointer transition-colors " +
  "bg-[#1C1C1E] text-white font-medium tabular-nums";

/* ── Formularios ──────────────────────────────────────────────────── */
export const CAMPO =
  "w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[17px] text-[#1C1C1E] " +
  "outline-none focus:border-[#007AFF] transition-colors";
export const ROTULO = "block text-[14px] text-[#6E6E73] mb-1.5";

/* ── Chapas de estado (pagado · debe · por vencer) ────────────────── */
export const CHAPA = "text-[14px] font-medium shrink-0";
