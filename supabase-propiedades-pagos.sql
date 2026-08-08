-- ============================================================
-- Propiedades — control de pago por propiedad
-- Correr en el editor SQL de Supabase (panel web).
--
-- SOLO AGREGA. No borra, no renombra y no modifica ningun dato
-- existente. Los cobros que ya estan cargados quedan intactos:
-- un cobro con status = 'pagado' se sigue leyendo como pagado
-- completo aunque paid_amount quede en 0.
--
-- La app FUNCIONA sin correr esto. Lo unico que queda bloqueado
-- (con aviso en pantalla) son los abonos parciales y el saldo a
-- favor, porque necesitan guardar un monto a medias.
-- ============================================================

-- Cuanto se ha abonado a ese mes. 0 = nada abonado.
ALTER TABLE rent_charges
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN rent_charges.paid_amount IS
  'Abono acumulado del mes. Si status = ''pagado'' el mes vale completo aunque esto sea 0 (filas historicas).';

-- Busquedas por propiedad + mes (la pantalla nueva agrupa asi).
CREATE INDEX IF NOT EXISTS idx_rent_charges_property_month
  ON rent_charges (property_id, month);

-- Verificacion (debe devolver una fila con paid_amount):
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'rent_charges' AND column_name = 'paid_amount';
