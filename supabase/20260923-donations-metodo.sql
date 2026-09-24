-- Maaser · cómo se pagó la donación
--
-- Qué hace: le agrega a las donaciones UNA columna opcional con la forma de
-- pago: cheque, transferencia (Yappy) o tarjeta. Hoy eso se escribe a mano
-- dentro de las notas ("Yappy", "Por tarjeta", "Transferencia": 11 casos
-- medidos el 23-sep-2026).
--
-- No toca ninguna fila existente: las 266 donaciones quedan con el método en
-- blanco. Sin esta migración la app funciona igual y los tres botones no se
-- guardan (la donación sí).
--
-- NO APLICADA. La corre Daniel.

alter table public.donations
  add column if not exists metodo text;

alter table public.donations
  drop constraint if exists donations_metodo_check;

alter table public.donations
  add constraint donations_metodo_check
  check (metodo is null or metodo in ('cheque', 'transferencia', 'tarjeta'));

comment on column public.donations.metodo is
  'Cómo se pagó: cheque | transferencia | tarjeta. NULL = no se dijo.';
