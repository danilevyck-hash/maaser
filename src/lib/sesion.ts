// La clave se pide UNA sola vez por teléfono.
//
// El pase vive en una cookie que no vence sola (los navegadores la recortan a
// unos 13 meses por su cuenta; eso no lo decide la app). Papá entra una vez y
// no vuelve a ver el teclado numérico.
//
// VERSION_SESION: al cambiarla, todos los pases viejos dejan de valer y todo
// el mundo entra de nuevo UNA vez. Se subió a "v2" el 23-sep-2026, con el
// rediseño, para que papá vuelva a entrar y vea lo nuevo.

export const VERSION_SESION = "v2";

/** Diez años. El navegador puede recortarlo; la app no lo vence. */
export const DURACION_COOKIE_SEG = 60 * 60 * 24 * 365 * 10;

export const NOMBRE_COOKIE = "session";

export async function tokenDeSesion(
  appPassword: string,
  supabaseUrl: string | undefined
): Promise<string> {
  const datos = new TextEncoder().encode(
    `${appPassword}${supabaseUrl ?? ""}|${VERSION_SESION}`
  );
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
