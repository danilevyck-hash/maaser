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

