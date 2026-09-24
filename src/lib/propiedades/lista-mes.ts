/**
 * La lista del mes: una fila por propiedad con inquilino.
 *
 * Toda la pantalla de Propiedades sale de aquí. No toca la base ni el DOM.
 */

import { addMonths, fmtMoney, toCents, fromCents } from "@/lib/propiedades-pagos";
import { cobrosPorMes, estadoDelMes, type CobroLeido, type EstadoMes } from "./estado-mes";
import { nombreEnPantalla } from "./nombre";
import { recargoDelMes, reglaDeRecargo, type PropiedadConRecargo } from "./recargo";

export type PropiedadLeida = PropiedadConRecargo & {
  id: number;
  name: string;
  rent_amount: number | string;
};

export type ContratoLeido = {
  id: number;
  property_id: number;
  tenant_name: string;
  tenant_phone?: string | null;
  start_date: string;
  end_date: string;
  rent_amount: number | string;
  active: boolean;
};

export type CobroDeFila = CobroLeido & { property_id: number; contract_id?: number | null };

export type FilaDelMes = {
  propiedadId: number;
  nombre: string;
  inquilino: string;
  /** El nombre tal cual está guardado, para escribir cobros nuevos. */
  inquilinoGuardado: string;
  telefono: string | null;
  contratoId: number;
  monto: number;
  estado: EstadoMes;
  /** El cobro de ESE mes, si ya existe una fila en la base. */
  cobroId?: number;
  /** El día en que se marcó pagado, para la hoja del ✓. */
  pagadoEl: string | null;
  /** Último mes seguido pagado, si va más allá del mes que se mira. */
  pagadoHasta: string | null;
  /** Meses que él marcó «no pagó», del más viejo al más nuevo. */
  mesesQueDebe: string[];
  montoQueDebe: number;
  /** Recargo por atraso de esos meses. 0 cuando la propiedad no cobra recargo. */
  recargo: number;
  /** Lo que hay que cobrarle: el alquiler que debe más el recargo. */
  montoQueDebeConRecargo: number;
};

/** El contrato vivo de una propiedad. Sin él, la propiedad no tiene fila. */
export function contratoVivo(
  contratos: ContratoLeido[],
  propiedadId: number,
): ContratoLeido | null {
  const suyos = contratos.filter((c) => c.property_id === propiedadId && c.active);
  if (suyos.length === 0) return null;
  return [...suyos].sort((a, b) => (a.end_date < b.end_date ? 1 : -1))[0];
}

/** Cuánto vale ese mes: lo que diga el cobro; si no hay, el contrato; si no, la propiedad. */
export function montoDelMes(input: {
  mes: string;
  cobro?: CobroLeido | null;
  contrato?: ContratoLeido | null;
  propiedad?: PropiedadLeida | null;
}): number {
  const { cobro, contrato, propiedad } = input;
  if (cobro && toCents(cobro.amount) > 0) return Number(cobro.amount);
  if (contrato && toCents(contrato.rent_amount) > 0) return Number(contrato.rent_amount);
  return Number(propiedad?.rent_amount ?? 0);
}

export function filasDelMes(input: {
  mes: string;
  propiedades: PropiedadLeida[];
  contratos: ContratoLeido[];
  cobros: CobroDeFila[];
  /** Hoy en Panamá: de ahí sale si al mes no pagado ya se le pasó el día. */
  hoy: string;
}): FilaDelMes[] {
  const { mes, propiedades, contratos, cobros, hoy } = input;

  const filas: FilaDelMes[] = [];
  for (const propiedad of propiedades) {
    const contrato = contratoVivo(contratos, propiedad.id);
    if (!contrato) continue;

    const suyos = cobros.filter((c) => c.property_id === propiedad.id);
    const porMes = cobrosPorMes(suyos);
    const cobro = porMes.get(mes) ?? null;

    // Pagado hasta: la cadena de meses pagados que arranca en el mes que se mira.
    let pagadoHasta: string | null = null;
    if (estadoDelMes(cobro) === "pagado") {
      let siguiente = addMonths(mes, 1);
      while (estadoDelMes(porMes.get(siguiente)) === "pagado") {
        pagadoHasta = siguiente;
        siguiente = addMonths(siguiente, 1);
      }
    }

    // Deuda: SOLO lo que él marcó «no pagó», hasta el mes que se mira.
    const mesesQueDebe: string[] = [];
    const regla = reglaDeRecargo(propiedad);
    let debeCentavos = 0;
    let recargoCentavos = 0;
    for (const [mesCobro, suCobro] of porMes) {
      if (mesCobro > mes) continue;
      if (estadoDelMes(suCobro) !== "no_pago") continue;
      mesesQueDebe.push(mesCobro);
      const suMonto = montoDelMes({ mes: mesCobro, cobro: suCobro, contrato, propiedad });
      debeCentavos += Math.max(0, toCents(suMonto));
      recargoCentavos += Math.max(0, toCents(recargoDelMes({ mes: mesCobro, monto: suMonto, regla, hoy })));
    }
    mesesQueDebe.sort();

    filas.push({
      propiedadId: propiedad.id,
      nombre: propiedad.name,
      inquilino: nombreEnPantalla(contrato.tenant_name),
      inquilinoGuardado: contrato.tenant_name,
      telefono: contrato.tenant_phone ?? null,
      contratoId: contrato.id,
      monto: montoDelMes({ mes, cobro, contrato, propiedad }),
      estado: estadoDelMes(cobro),
      cobroId: cobro?.id,
      pagadoEl: cobro?.paid_date ?? null,
      pagadoHasta,
      mesesQueDebe,
      montoQueDebe: fromCents(debeCentavos),
      recargo: fromCents(recargoCentavos),
      montoQueDebeConRecargo: fromCents(debeCentavos + recargoCentavos),
    });
  }
  return filas;
}

export type ResumenDelMes = {
  pagados: number;
  total: number;
  cobrado: number;
  deuda: number;
  /** «2 de 7 · $3,700» */
  texto: string;
  /** «te deben $1,300», o null cuando nadie debe nada. */
  textoDeuda: string | null;
};

export function resumenDelMes(filas: FilaDelMes[]): ResumenDelMes {
  const pagadas = filas.filter((f) => f.estado === "pagado");
  const cobrado = fromCents(pagadas.reduce((suma, f) => suma + toCents(f.monto), 0));
  const deuda = fromCents(filas.reduce((suma, f) => suma + toCents(f.montoQueDebeConRecargo), 0));
  return {
    pagados: pagadas.length,
    total: filas.length,
    cobrado,
    deuda,
    texto: `${pagadas.length} de ${filas.length} · ${fmtMoney(cobrado)}`,
    textoDeuda: deuda > 0 ? `te deben ${fmtMoney(deuda)}` : null,
  };
}
