import { ordenarPorFecha } from "./lista-donaciones";
import { nombreEnPantalla } from "./renglon";
import type { DonacionMinima } from "./tipos";

// El año en una mirada: una barra por mes hebreo.
//
// ⚠️ NO siempre son doce. Un año bisiesto hebreo tiene TRECE meses (Adar I y
// Adar II) y 5787 —el que corre— es uno de ellos. Las barras se derivan de los
// meses del año, nunca de un 12 escrito a mano.
//
// La barra más alta es el 100 %: lo que se compara es un mes con los otros
// meses del mismo año, no con una meta.

export type MesHebreo = {
  name: string;
  startDate: string;
  endDate: string;
  label: string;
};

export type MesDelAnio<T extends DonacionMinima = DonacionMinima> = {
  nombre: string;
  abrev: string;
  label: string;
  desde: string;
  hasta: string;
  total: number;
  cantidad: number;
  donaciones: T[];
  /** 0 a 100. La barra más alta del año vale 100. */
  alto: number;
};

/** "Tishrei" → "Tis"; "Adar I" → "AdI"; "Av" → "Av". */
export function abreviarMes(nombre: string): string {
  const partes = (nombre || "").trim().split(/\s+/);
  if (partes.length > 1) return partes[0].slice(0, 2) + partes[1];
  return partes[0].slice(0, 3);
}

export function mesesDelAnio<T extends DonacionMinima>(
  donaciones: T[],
  meses: MesHebreo[]
): MesDelAnio<T>[] {
  const armados = meses.map((m) => {
    const suyas = ordenarPorFecha(
      donaciones.filter((d) => d.date >= m.startDate && d.date <= m.endDate)
    );
    return {
      nombre: m.name,
      abrev: abreviarMes(m.name),
      label: m.label,
      desde: m.startDate,
      hasta: m.endDate,
      total: redondear(suyas.reduce((s, d) => s + (Number(d.amount) || 0), 0)),
      cantidad: suyas.length,
      donaciones: suyas,
      alto: 0,
    };
  });

  const mayor = armados.reduce((m, x) => Math.max(m, x.total), 0);
  return armados.map((m) => ({
    ...m,
    alto: mayor > 0 ? Math.round((m.total / mayor) * 100) : 0,
  }));
}

/** El mes que se llevó más plata. Con el año en cero, null. */
export function mesMasFuerte<T extends DonacionMinima>(
  meses: MesDelAnio<T>[]
): MesDelAnio<T> | null {
  let mejor: MesDelAnio<T> | null = null;
  for (const m of meses) {
    if (m.total > 0 && (!mejor || m.total > mejor.total)) mejor = m;
  }
  return mejor;
}

export type FilaBeneficiario<T extends DonacionMinima = DonacionMinima> = {
  clave: string;
  nombre: string;
  veces: number;
  total: number;
  donaciones: T[];
};

/** "Ver por beneficiario": nombre · veces · total, del mayor al menor. */
export function porBeneficiario<T extends DonacionMinima>(
  donaciones: T[]
): FilaBeneficiario<T>[] {
  const mapa = new Map<string, FilaBeneficiario<T>>();
  for (const d of donaciones) {
    const nombre = nombreEnPantalla(d);
    const clave = nombre.toLowerCase();
    const acum =
      mapa.get(clave) ?? { clave, nombre, veces: 0, total: 0, donaciones: [] as T[] };
    acum.veces += 1;
    acum.total += Number(d.amount) || 0;
    acum.donaciones.push(d);
    mapa.set(clave, acum);
  }
  return Array.from(mapa.values())
    .map((f) => ({ ...f, total: redondear(f.total), donaciones: ordenarPorFecha(f.donaciones) }))
    .sort((a, b) => (b.total !== a.total ? b.total - a.total : a.nombre.localeCompare(b.nombre)));
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
