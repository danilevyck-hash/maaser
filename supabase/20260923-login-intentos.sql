-- Maaser · freno de intentos del PIN
--
-- Qué hace: crea UNA tabla para contar los intentos fallidos de clave por
-- dirección de internet. Cinco fallos en 15 minutos cierran la puerta 15
-- minutos. Medido el 23-sep-2026: la app contestaba 10 claves seguidas al
-- instante, así que probar los 10.000 PIN posibles tomaba minutos.
--
-- No toca ninguna tabla existente. Sin esta migración la app funciona igual
-- (falla ABIERTA: deja entrar con la clave correcta y no frena a nadie).
--
-- NO APLICADA. La corre Daniel.

create table if not exists public.maaser_login_intentos (
  ip text primary key,
  fallos integer not null default 0,
  primer_fallo_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.maaser_login_intentos is
  'Intentos fallidos de PIN por dirección. Se limpia sola: una racha de más de 15 minutos ya no cuenta.';

-- RLS cerrado, igual que el resto: solo service_role entra.
alter table public.maaser_login_intentos enable row level security;
