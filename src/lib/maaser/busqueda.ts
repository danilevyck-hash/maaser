import { claveDeCheque } from "./cheque";
import { normalizarNombre } from "./historial-beneficiario";
import { nombreEnPantalla } from "./renglon";
import type { DonacionMinima } from "./tipos";

// Buscar es filtrar sobre lo que ya está en pantalla.
// Subcadena normalizada (sin tildes, sin mayúsculas), nunca por parecido.

export function filtrarPorBeneficiario<T extends DonacionMinima>(
  donaciones: T[],
  texto: string
): T[] {
  const q = normalizarNombre(texto);
  if (!q) return donaciones;
  return donaciones.filter((d) =>
    normalizarNombre(nombreEnPantalla(d)).includes(q)
  );
}

/**
 * Lo mismo, pero un texto de PUROS NÚMEROS busca también el número de cheque.
 *
 * Con eso cuadra con el banco: el estado de cuenta dice «cheque 2936» y él
 * escribe 2936 para encontrar a quién se lo dio. Hoy eso no encuentra nada,
 * porque buscar es solo por nombre (medido: 123 de 266 donaciones llevan
 * número de cheque).
 *
 * Un nombre con números adentro sigue encontrándose por nombre: primero se
 * busca por nombre y el cheque SUMA, nunca resta.
 */
export function filtrarPorNombreOCheque<T extends DonacionMinima>(
  donaciones: T[],
  texto: string
): T[] {
  const crudo = (texto ?? "").trim();
  if (!crudo) return donaciones;

  const porNombre = filtrarPorBeneficiario(donaciones, crudo);
  const digitos = crudo.replace(/\D/g, "");
  if (!digitos) return porNombre;

  const vistas = new Set(porNombre);
  const porCheque = donaciones.filter(
    (d) => !vistas.has(d) && claveDeCheque(d.check_number).includes(String(Number(digitos)))
  );
  return [...porNombre, ...porCheque];
}
