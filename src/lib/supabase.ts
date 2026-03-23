import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export type PersonalExpense = {
  id: number;
  date: string;
  amount: number;
  category: string;
  subcategory?: string;
  payment_method: string;
  created_at?: string;
};

export const EXPENSE_CATEGORIES = [
  "Restaurante",
  "Super",
  "Carro",
  "Casa",
  "Mensualidad",
  "Otros Gastos",
] as const;

export const PAYMENT_METHODS = [
  "Yappy",
  "ACH",
  "Tarjeta de Crédito",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Restaurante: "#E74C3C",
  Super: "#3498DB",
  Carro: "#2ECC71",
  Casa: "#F39C12",
  Mensualidad: "#9B59B6",
  "Otros Gastos": "#95A5A6",
};
