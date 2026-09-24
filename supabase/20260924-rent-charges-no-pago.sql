-- ============================================================
-- Propiedades — el estado «no pagó» (24-sep-2026)
--
-- NO LA APLIQUES DESDE EL CÓDIGO: la corre Daniel en el editor SQL.
--
-- Qué hace: deja que rent_charges.status guarde el valor 'no_pago',
-- que es lo que papá marca cuando dice «no ha pagado». Es lo ÚNICO
-- que la app llama deuda: un mes sin marcar no debe nada.
--
-- SOLO AGREGA. No borra, no renombra y no toca una sola fila.
--
-- Medido el 24-sep-2026 contra producción: la tabla se creó con
-- `status TEXT NOT NULL DEFAULT 'pendiente'` y SIN CHECK
-- (supabase-propiedades.sql), así que lo más probable es que
-- 'no_pago' ya se guarde sin correr nada. Este archivo existe por
-- si alguna vez se agregó un CHECK a mano en el panel: entonces
-- hay que correrlo. La app FUNCIONA sin él — si el guardado rebota,
-- lo dice en una línea en pantalla y no rompe nada.
-- ============================================================

do $$
declare
  restriccion text;
begin
  -- El CHECK de status, si existe.
  select con.conname into restriccion
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
   where rel.relname = 'rent_charges'
     and con.contype = 'c'
     and pg_get_constraintdef(con) ilike '%status%'
   limit 1;

  if restriccion is not null then
    execute format('alter table rent_charges drop constraint %I', restriccion);
  end if;

  alter table rent_charges
    add constraint rent_charges_status_check
    check (status in ('pendiente', 'pagado', 'mora', 'no_pago'));
end $$;

comment on column rent_charges.status is
  'pagado = papá tocó el círculo · no_pago = papá dijo que no pagó (lo único que es deuda) · pendiente y mora = filas viejas que el sistema creó solo: la app las lee como "sin marcar".';

-- Verificación (debe listar los cuatro valores):
-- select pg_get_constraintdef(con.oid)
--   from pg_constraint con join pg_class rel on rel.oid = con.conrelid
--  where rel.relname = 'rent_charges' and con.contype = 'c';
