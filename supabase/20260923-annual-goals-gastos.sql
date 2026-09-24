-- Maaser · "lo que gastas" por año hebreo
--
-- Qué hace: le agrega a la tabla de metas UNA columna para el gasto anual que
-- papá escribe una sola vez al año. De ese número sale la línea
-- "Debes dar $X (10 % de lo que gastas) · faltan $Y".
--
-- No toca ninguna fila existente. Sin esta migración la app funciona igual:
-- la tarjeta dice "poner lo que gastas ›" y el 10 % no se muestra.
--
-- NO APLICADA. La corre Daniel.

alter table public.annual_goals
  add column if not exists gastos_anuales numeric;

comment on column public.annual_goals.gastos_anuales is
  'Lo que gasta en el año hebreo, escrito por el dueño. El maaser que debe dar es el 10 % de esto. NULL = todavía no lo puso.';
