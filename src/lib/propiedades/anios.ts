/**
 * El historial de una propiedad: cada año en doce círculos.
 *
 * ✓ pagado · ✗ no pagó · vacío sin marcar · punteado los meses que no llegaron.
 * Los años van del actual hacia atrás, hasta el primero con cobros o contrato.
 */

import { fromCents, toCents } from "@/lib/propiedades-pagos";
import { cobrosPorMes, estadoDelMes, type CobroLeido, type EstadoMes } from "./estado-mes";
import { listaDeMeses } from "./mes-en-palabras";
import { montoDelMes, type ContratoLeido, type PropiedadLeida } from "./lista-mes";
import { recargoDelMes, reglaDeRecargo } from "./recargo";

export type CirculoDeMes = {
  mes: string;
  estado: EstadoMes;
  futuro: boolean;
  monto: number;
  cobroId?: number;
};

export type AnioDeLaPropiedad = {
  anio: number;
  meses: CirculoDeMes[];
  pagados: number;
  mesesQueDebe: string[];
  montoQueDebe: number;
  /** Recargo por atraso de los meses no pagados de ese año. */
  recargo: number;
  /** «12 de 12» */
  resumen: string;
  /** «debe agosto · $1,300», o null. */
  deuda: string | null;
};

export function primerAnioConHistoria(input: {
  cobros: CobroLeido[];
  contratos: ContratoLeido[];
  anioDeHoy: number;
}): number {
  const anios: number[] = [];
  for (const cobro of input.cobros) anios.push(Number(cobro.month.slice(0, 4)));
  for (const contrato of input.contratos) anios.push(Number(contrato.start_date.slice(0, 4)));
  const validos = anios.filter((a) => Number.isFinite(a) && a > 1900);
  if (validos.length === 0) return input.anioDeHoy;
  return Math.min(Math.min(...validos), input.anioDeHoy);
}

export function aniosDeLaPropiedad(input: {
  propiedad: PropiedadLeida;
  contratos: ContratoLeido[];
  cobros: CobroLeido[];
  mesDeHoy: string;
  /** Hoy en Panamá. Sin él no se calcula recargo (falla abierto).  */
  hoy?: string;
}): AnioDeLaPropiedad[] {
  const { propiedad, contratos, cobros, mesDeHoy } = input;
  const hoy = input.hoy ?? "";
  const regla = hoy ? reglaDeRecargo(propiedad) : null;
  const anioDeHoy = Number(mesDeHoy.slice(0, 4));
  const porMes = cobrosPorMes(cobros);
  const desde = primerAnioConHistoria({ cobros, contratos, anioDeHoy });

  const contratoDeReferencia =
    contratos.find((c) => c.active) ??
    [...contratos].sort((a, b) => (a.end_date < b.end_date ? 1 : -1))[0] ??
    null;

  const anios: AnioDeLaPropiedad[] = [];
  for (let anio = anioDeHoy; anio >= desde; anio--) {
    const meses: CirculoDeMes[] = [];
    const mesesQueDebe: string[] = [];
    let debeCentavos = 0;
    let recargoCentavos = 0;
    let pagados = 0;

    for (let m = 1; m <= 12; m++) {
      const mes = `${anio}-${String(m).padStart(2, "0")}`;
      const cobro = porMes.get(mes) ?? null;
      const estado = estadoDelMes(cobro);
      const monto = montoDelMes({ mes, cobro, contrato: contratoDeReferencia, propiedad });
      if (estado === "pagado") pagados += 1;
      if (estado === "no_pago") {
        mesesQueDebe.push(mes);
        debeCentavos += Math.max(0, toCents(monto));
        recargoCentavos += Math.max(0, toCents(recargoDelMes({ mes, monto, regla, hoy })));
      }
      meses.push({ mes, estado, futuro: mes > mesDeHoy, monto, cobroId: cobro?.id });
    }

    const montoQueDebe = fromCents(debeCentavos);
    anios.push({
      anio,
      meses,
      pagados,
      mesesQueDebe,
      montoQueDebe,
      recargo: fromCents(recargoCentavos),
      resumen: `${pagados} de 12`,
      deuda:
        mesesQueDebe.length > 0
          ? `debe ${listaDeMeses(mesesQueDebe, String(anio))}`
          : null,
    });
  }
  return anios;
}
