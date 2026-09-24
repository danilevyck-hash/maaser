-- Maaser · los compromisos mensuales
--
-- Qué hace: crea UNA tabla nueva para recordar las donaciones que se repiten
-- todos los meses. Tres notas de papá lo dicen con todas las letras ("400
-- mensuales", "180x mes", "260xmes pago en tarjetas") y "Rab Gil" aparece con
-- $1,000 tres meses seguidos, anotado a mano cada vez.
--
-- Cómo se usa: al anotar una donación, el interruptor "Se repite cada mes"
-- guarda aquí el beneficiario y el monto. Cada mes hebreo, arriba de la lista,
-- aparece una línea por compromiso al que todavía no se le dio; tocarla anota
-- la donación con la fecha de hoy.
--
-- 🔴 No es una deuda: si el mes termina sin tocarla, la línea desaparece sola.
-- 🔴 No toca NI UNA fila existente: `donations` queda igual. Sin esta
--    migración la app funciona exactamente como hoy y el interruptor "Se
--    repite cada mes" no se dibuja.
-- 🔴 Nace VACÍA: los ejemplos de arriba los crea papá cuando quiera.
--
-- NO APLICADA. La corre Daniel.

create table if not exists public.maaser_compromisos (
  id          bigserial primary key,
  beneficiary text        not null,
  amount      numeric(12,2) not null check (amount > 0),
  metodo      text,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  constraint maaser_compromisos_beneficiary_no_vacio
    check (btrim(beneficiary) <> ''),
  constraint maaser_compromisos_metodo_check
    check (metodo is null or metodo in ('cheque', 'transferencia', 'tarjeta'))
);

-- Un solo compromiso VIVO por beneficiario: volver a prender el interruptor
-- para el mismo nombre cambia el monto, no crea una segunda línea.
-- Es un único PARCIAL: uno dado de baja no estorba para volver a crearlo.
create unique index if not exists maaser_compromisos_uno_vivo_por_nombre
  on public.maaser_compromisos (lower(btrim(beneficiary)))
  where activo;

comment on table public.maaser_compromisos is
  'Donaciones que se repiten cada mes. Una línea viva por beneficiario; darla de baja es activo = false, nunca un DELETE.';
comment on column public.maaser_compromisos.activo is
  'false = "Ya no se repite". La fila se conserva para no perder el historial.';
