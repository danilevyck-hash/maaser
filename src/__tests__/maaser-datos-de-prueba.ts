// Las donaciones de mentira de los candados de Maaser.
//
// Las cinco de 5787 son las REALES, medidas contra producción el 24-sep-2026:
// $678 en cinco donaciones desde el 12 de septiembre. Las de 5786 son un
// puñado, suficiente para que el separador de año tenga que aparecer.

export type DonacionDePrueba = {
  id: number;
  date: string;
  beneficiary: string;
  amount: number;
  check_number?: string | null;
  notes?: string | null;
  metodo?: string | null;
  status: "valido";
};

const v = (d: Omit<DonacionDePrueba, "status">): DonacionDePrueba => ({
  ...d,
  status: "valido",
});

/** 5787 empezó el 12-sep-2026. Estas cinco suman $678. */
export const DE_5787: DonacionDePrueba[] = [
  v({ id: 541, date: "2026-09-23", beneficiary: "Para Soldados Usar Lulab", amount: 144 }),
  v({ id: 540, date: "2026-09-22", beneficiary: "Iosef Milszteln", amount: 101, check_number: "2936" }),
  v({ id: 539, date: "2026-09-15", beneficiary: "Maicol M", amount: 101, check_number: "2935" }),
  v({ id: 538, date: "2026-09-14", beneficiary: "Alberto Sedani", amount: 180, check_number: "2933", notes: "Esposa enferma" }),
  v({ id: 537, date: "2026-09-14", beneficiary: "David Visacosky", amount: 152, check_number: "2934" }),
];

/** 5786 fue del 23-sep-2025 al 11-sep-2026. Tévet es el mes más fuerte. */
export const DE_5786: DonacionDePrueba[] = [
  v({ id: 530, date: "2026-08-20", beneficiary: "Jaim Sued", amount: 360 }),
  v({ id: 529, date: "2026-07-02", beneficiary: "Shaare Jesed", amount: 3120, notes: "260xmes pago en tarjetas" }),
  v({ id: 528, date: "2026-05-25", beneficiary: "Rab Gil", amount: 1000, notes: "400 mensuales" }),
  v({ id: 527, date: "2026-04-25", beneficiary: "Rab Gil", amount: 1000 }),
  v({ id: 526, date: "2026-01-06", beneficiary: "Rubén Elin", amount: 4800 }),
  v({ id: 525, date: "2025-12-15", beneficiary: "Donación", amount: 101 }),
];

export const TODAS = [...DE_5787, ...DE_5786];

export const TOTAL_5787 = DE_5787.reduce((s, d) => s + d.amount, 0);
export const TOTAL_5786 = DE_5786.reduce((s, d) => s + d.amount, 0);
