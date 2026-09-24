// El mínimo que necesitan los módulos puros de Maaser para trabajar.
// Se declara aquí para que las pruebas no tengan que armar una donación entera.

export type DonacionMinima = {
  id?: number;
  date: string;
  beneficiary?: string | null;
  amount: number;
  check_number?: string | null;
  notes?: string | null;
  metodo?: string | null;
};
