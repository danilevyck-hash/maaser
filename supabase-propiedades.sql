-- Propiedades module tables
-- Run this in the Supabase SQL editor

CREATE TABLE rent_properties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'residencial',
  icon TEXT NOT NULL DEFAULT '🏠',
  rent_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rent_contracts (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES rent_properties(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  tenant_email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rent_charges (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES rent_properties(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES rent_contracts(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  due_date DATE NOT NULL,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rent_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_charges ENABLE ROW LEVEL SECURITY;

-- Only service_role (server-side) can access data
-- anon key has NO access — all queries go through Next.js API routes
CREATE POLICY "Service role full access on rent_properties" ON rent_properties
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on rent_contracts" ON rent_contracts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on rent_charges" ON rent_charges
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- IMPORTANT: Also update policies for donations, annual_goals, and expenses tables:
--
-- DROP POLICY IF EXISTS "Allow all on donations" ON donations;
-- CREATE POLICY "Service role full access on donations" ON donations
--   FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
--
-- DROP POLICY IF EXISTS "Allow all on annual_goals" ON annual_goals;
-- CREATE POLICY "Service role full access on annual_goals" ON annual_goals
--   FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
--
-- DROP POLICY IF EXISTS "Allow all on expenses" ON expenses;
-- CREATE POLICY "Service role full access on expenses" ON expenses
--   FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
