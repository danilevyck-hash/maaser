-- Crillón (propiedad 10, contrato 7, inquilino José).
-- La renta real es $2,200/mes. Los $17,600 que quedaron como renta desde junio
-- son 8 × $2,200: papá cobró 8 meses por adelantado el 12-may-2026 (confirmado
-- por Alberto el 23-sep-2026). Se vuelve la renta a $2,200 y se marcan pagados
-- los 8 meses jun-2026 → ene-2027 con la fecha en que entró la plata.
-- Marzo 2026 (mora $2,200) NO se toca: no sabemos si se pagó.
begin;

-- 1 fila
update rent_properties set rent_amount = 2200
 where id = 10 and rent_amount = 17600;

-- 1 fila
update rent_contracts set rent_amount = 2200
 where id = 7 and rent_amount = 17600;

-- 4 filas: jun · jul · ago · sep 2026 → $2,200, pagado el 12-may-2026
update rent_charges
   set amount = 2200, status = 'pagado', paid_date = '2026-05-12'
 where property_id = 10
   and month in ('2026-06', '2026-07', '2026-08', '2026-09');

-- 4 filas nuevas: oct · nov · dic 2026 · ene 2027, pagadas por adelantado
insert into rent_charges (property_id, contract_id, tenant_name, month, amount, status, due_date, paid_date, paid_amount)
select 10, 7, 'José', m, 2200, 'pagado', (m || '-01')::date, '2026-05-12', 0
  from unnest(array['2026-10', '2026-11', '2026-12', '2027-01']) as m
 where not exists (select 1 from rent_charges c where c.property_id = 10 and c.month = m);

commit;
