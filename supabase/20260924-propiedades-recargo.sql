-- ============================================================
-- Propiedades — recargo por atraso (24-sep-2026)
--
-- NO LA APLIQUES DESDE EL CÓDIGO: la corre Daniel en el editor SQL.
--
-- Qué hace: guarda, por propiedad, a partir de qué día del mes hay
-- recargo y de cuánto por ciento. Las dos son opcionales: vacías
-- significan «esta propiedad no cobra recargo», que es como están
-- hoy las siete.
--
-- SOLO AGREGA. No borra, no renombra y no toca una sola fila.
-- La app FUNCIONA sin correr esto: sin las columnas, la línea de
-- recargo ni se dibuja en Editar y ningún número cambia.
-- ============================================================

alter table rent_properties
  add column if not exists recargo_dia integer,
  add column if not exists recargo_pct numeric(5,2);

comment on column rent_properties.recargo_dia is
  'Día del mes a partir del cual el alquiler lleva recargo (paga después de ese día). NULL = sin recargo.';
comment on column rent_properties.recargo_pct is
  'Por ciento del alquiler que se cobra de recargo. NULL o 0 = sin recargo.';

-- Verificación (debe devolver dos filas):
-- select column_name, data_type from information_schema.columns
--  where table_name = 'rent_properties' and column_name like 'recargo%';
