import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service_role key on server side for RLS bypass, anon key as fallback
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Donation = {
  id: number;
  date: string;
  beneficiary: string;
  amount: number;
  check_number?: string;
  status: "valido" | "anulado";
  notes?: string;
  created_at?: string;
};

export type AnnualGoal = {
  id: number;
  year: number;
  goal_amount: number;
};

export type Expense = {
  id: number;
  date: string;
  amount: number;
  notes?: string;
  created_at?: string;
};

export type FinanceExpense = {
  id: number;
  date: string;
  amount: number;
  category: string;
  notes?: string;
  payment_method: string;
  receipt_url?: string;
  subcategory?: string;
  created_at?: string;
};

export type FinanceCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_enabled: boolean;
};

export type FinanceBudget = {
  id: string;
  category: string;
  budget_amount: number;
  month: string;
  created_at?: string;
  updated_at?: string;
};

export type FinanceRecurring = {
  id: string;
  amount: number;
  category: string;
  notes?: string;
  payment_method: string;
  day_of_month: number;
  is_active: boolean;
  created_at?: string;
};

export const PAYMENT_METHODS = ["Yappy", "ACH", "Tarjeta de Crédito"] as const;

export type CxcCliente = {
  id: string;
  nombre: string;
  telefono?: string | null;
  notas?: string | null;
  created_at?: string;
};

export type CxcMovimientoTipo = "cargo" | "abono" | "ajuste";

export type CxcMovimiento = {
  id: string;
  cliente_id: string;
  fecha: string;
  tipo: CxcMovimientoTipo;
  monto: number;
  descripcion?: string | null;
  created_at?: string;
};

export type CxcClienteConBalance = CxcCliente & {
  balance: number;
  ultimo_movimiento?: string | null;
};

