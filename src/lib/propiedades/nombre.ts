/**
 * El nombre del inquilino como se lee, no como se cargó.
 *
 * En la base hay nombres en mayúsculas de cuando se importaron ('SEBASTIÁN').
 * Aquí solo se cambia cómo se VE: la base no se toca, y en «Editar» él lo
 * escribe como quiera. Un nombre que ya trae minúsculas se deja tal cual.
 */
export function nombreEnPantalla(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "").trim();
  if (!limpio) return "";
  if (limpio !== limpio.toUpperCase()) return limpio;
  return limpio
    .toLowerCase()
    .split(" ")
    .map((palabra) => (palabra ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra))
    .join(" ");
}

/** «Moisés Waisberg» -> «Moisés». El aviso de contratos habla por el nombre. */
export function primerNombre(nombre: string | null | undefined): string {
  return nombreEnPantalla(nombre).split(" ")[0] ?? "";
}
