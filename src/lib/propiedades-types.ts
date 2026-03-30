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
  status: "pagado" | "pendiente" | "mora";
  due_date: string;
  paid_date: string | null;
  created_at?: string;
  // joined
  property?: RentProperty;
};
