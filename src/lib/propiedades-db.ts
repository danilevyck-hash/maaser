import { supabase } from "@/lib/supabase";

/**
 * ¿La tabla rent_charges ya tiene la columna paid_amount?
 *
 * La app tiene que funcionar ANTES de que Daniel corra el SQL a mano.
 * Sin la columna, los pagos completos siguen funcionando igual; lo único
 * que se bloquea (con mensaje claro) son los abonos parciales y el saldo
 * a favor, que necesitan guardar un monto a medias.
 */
let cached: boolean | null = null;

export function resetPaidAmountCache() {
  cached = null;
}

export async function supportsPartialPayments(): Promise<boolean> {
  if (cached !== null) return cached;

  const { error } = await supabase.from("rent_charges").select("paid_amount").limit(1);
  if (!error) {
    cached = true;
    return true;
  }

  const missing =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /paid_amount/i.test(error.message || "");

  if (missing) {
    cached = false;
    return false;
  }

  // Error de red o de permisos: no lo cacheamos, puede ser pasajero.
  return false;
}

export const FALTA_SQL_MSG =
  "Para registrar abonos parciales o saldo a favor falta correr un cambio en la base de datos " +
  "(columna paid_amount en rent_charges). Mientras tanto puedes registrar meses completos.";
