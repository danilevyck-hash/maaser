export type RentProperty = {
  id: number;
  name: string;
  location: string;
  type: "residencial" | "comercial";
  icon: string;
  rent_amount: number;
  created_at?: string;
};

export type RentContract = {
  id: number;
  property_id: number;
  tenant_name: string;
  tenant_phone?: string;
  tenant_email?: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  active: boolean;
  created_at?: string;
  // joined
  property?: RentProperty;
};

export type RentCharge = {
  id: number;
  property_id: number;
  contract_id: number | null;
  tenant_name: string;
  month: string; // 'YYYY-MM'
  amount: number;
  /**
   * pagado = papá tocó el círculo · no_pago = papá dijo que no pagó (lo único
   * que la app llama deuda) · pendiente y mora = filas viejas que el sistema
   * creó solo, que hoy se leen como «sin marcar».
   */
  status: "pagado" | "pendiente" | "mora" | "no_pago";
  due_date: string;
  paid_date: string | null;
  /** Abono parcial. undefined mientras no se corra el SQL de paid_amount. */
  paid_amount?: number | null;
  created_at?: string;
  // joined
  property?: RentProperty;
};
