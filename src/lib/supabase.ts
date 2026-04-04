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

