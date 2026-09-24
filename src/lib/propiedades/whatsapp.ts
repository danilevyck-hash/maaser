/**
 * Cobrar es un toque: se abre WhatsApp con el mensaje ya escrito.
 *
 * El número se guarda como se pueda ('+507 6917-4827', '68867153') y WhatsApp
 * lo quiere sin espacios, sin guiones y con el país adelante.
 */

import { fmtMoney } from "@/lib/propiedades-pagos";
import { listaDeMeses } from "./mes-en-palabras";

export const PAIS_PANAMA = "507";

/** '+507 6917-4827' -> '50769174827'. Sin número, null. */
export function numeroWhatsapp(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.startsWith(PAIS_PANAMA) ? digitos : `${PAIS_PANAMA}${digitos}`;
}

/** 'Sebastián, me falta el alquiler de agosto ($1,300). Gracias, Alberto' */
export function mensajeDeCobro(input: {
  inquilino: string;
  meses: string[];
  monto: number;
  /** Recargo por atraso. 0 o sin dato: el mensaje no lo nombra. */
  recargo?: number;
  anioDeReferencia?: string;
}): string {
  const { inquilino, meses, monto, anioDeReferencia } = input;
  const recargo = input.recargo ?? 0;
  const lista = listaDeMeses(meses, anioDeReferencia);
  const cuerpo =
    meses.length === 1
      ? `me falta el alquiler de ${lista}`
      : `me faltan los alquileres de ${lista}`;
  const cola = recargo > 0 ? ` más ${fmtMoney(recargo)} de recargo` : "";
  return `${inquilino}, ${cuerpo} (${fmtMoney(monto)})${cola}. Gracias, Alberto`;
}

export function enlaceWhatsapp(input: {
  telefono: string | null | undefined;
  inquilino: string;
  meses: string[];
  monto: number;
  recargo?: number;
  anioDeReferencia?: string;
}): string | null {
  const numero = numeroWhatsapp(input.telefono);
  if (!numero) return null;
  const texto = mensajeDeCobro(input);
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
