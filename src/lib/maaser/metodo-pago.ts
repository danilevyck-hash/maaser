// Cómo pagó. Los tres salen de lo que papá ya escribía a mano en las notas:
// "Yappy", "Tarjeta", "Transferencia", "Por tarjeta" (11 casos medidos).
// El campo es OPCIONAL: una donación sin método se guarda igual.

export const METODOS_PAGO = [
  { id: "cheque", etiqueta: "Cheque" },
  { id: "transferencia", etiqueta: "Transferencia / Yappy" },
  { id: "tarjeta", etiqueta: "Tarjeta" },
] as const;

export type MetodoPago = (typeof METODOS_PAGO)[number]["id"];

const VALIDOS = new Set<string>(METODOS_PAGO.map((m) => m.id));

/** Un valor raro no se guarda: vuelve null, nunca revienta ni inventa. */
export function normalizarMetodo(valor: unknown): MetodoPago | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toLowerCase();
  return VALIDOS.has(limpio) ? (limpio as MetodoPago) : null;
}

export function etiquetaMetodo(valor: unknown): string | null {
  const id = normalizarMetodo(valor);
  if (!id) return null;
  return METODOS_PAGO.find((m) => m.id === id)?.etiqueta ?? null;
}
