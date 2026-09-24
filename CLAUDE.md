# Maaser — Gestión para papá

App para gestionar donaciones (maaser/tzedaká), gastos de InDriver y apartamentos de papá en un solo lugar.

## Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS
- **Email:** Resend (resumen mensual automático)
- **PWA:** Service worker registrado

## Módulos
| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Maaser | `/maaser` | **Dos pestañas: Donaciones · Resumen.** Lista corrida de todos los años, el 10 % de lo que gasta, y el resumen mes a mes del año elegido |
| InDriver | `/indriver` | Gastos por mes/año, resumen anual |
| Propiedades | `/propiedades` | Control de pago **por propiedad** (pagado hasta / debe), contratos, historial de cobros |
| Finanzas | `/finanzas` | Presupuesto y gastos por categoría |

## Maaser — el rediseño del 23-sep-2026

- **La fecha de "hoy" es la de PANAMÁ, no la de Londres** (`src/lib/fecha-panama.ts`).
  Antes se usaba `new Date().toISOString()` y toda donación anotada después de las
  7 de la noche quedaba con la fecha de mañana: pasó 12 veces. Todo lo que diga
  "hoy" pasa por `hoyPanamaISO()`. Las filas viejas NO se tocaron.
- **Pantalla 1, Donaciones:** tarjeta con el año hebreo, lo que lleva dado, la barra
  y la línea **"Debes dar $X (10 % de lo que gastas) · faltan $Y"**. Debajo, el botón
  grande, el buscador y **UNA lista corrida de TODAS las donaciones**, de la más nueva
  a la más vieja, con separador `── AÑO 5786 · $81,198 ──` al cambiar de año
  (`lista-donaciones.ts`). Tocar un renglón abre editar/borrar: **no hay 🗑 a la vista**.
  Sin nombre se muestra "Sin nombre" en gris.
- **Lo que gasta se escribe UNA vez al año** (`annual_goals.gastos_anuales`, por año
  hebreo). Sin el dato no se inventa nada: la tarjeta dice "poner lo que gastas ›".
- **Pantalla 2, Nueva donación:** los **5 botones de monto SE DERIVAN** de las
  donaciones reales (`montos-frecuentes.ts`; medido: $101 · $180 · $260 · $126 · $360
  explican el 70 %), **nunca se escriben a mano**. Fecha de Panamá a la vista, cheque,
  **cómo pagó** (cheque · transferencia/Yappy · tarjeta, `donations.metodo`), nota y
  "Guardar sin nombre". Si el nombre ya existe, una línea azul recuerda **las últimas 3**
  que le dio — pareo por **igualdad del nombre normalizado, NUNCA por parecido**
  (`historial-beneficiario.ts`): hay nueve nombres que empiezan con "David".
  **Sin sugerencias de nombres.**
- **Pantalla 3, Resumen:** scroll con **todos los años hebreos con datos**, derivados de
  las fechas (`anios-con-datos.ts`); los 12 meses del año elegido con monto y cantidad,
  los vacíos en $0; **cada mes se toca** y despliega sus donaciones. Abajo viven
  "Ver por beneficiario ›" y "Exportar" (PDF para imprimir · Excel para el contador).
  "Beneficiarios" dejó de ser pestaña.
- "Año Hebreo" **con ñ** en todo el sistema.

⚠️ **SQL pendiente (escrito, NO aplicado — lo corre Daniel):** `supabase/*.sql`.
El código **falla ABIERTO** sin los tres: la app funciona igual.
| Archivo | Qué hace | Sin él |
|---|---|---|
| `20260923-annual-goals-gastos.sql` | columna `gastos_anuales` | no sale el 10 %; la tarjeta dice "poner lo que gastas ›" |
| `20260923-donations-metodo.sql` | columna `metodo` | la donación se guarda igual, sin la forma de pago |
| `20260923-login-intentos.sql` | tabla del freno de PIN | no se frena a nadie |

## Auth
- Login con PIN de 4 dígitos (página `/login`)
- Middleware protege todas las rutas excepto `/login` y `/api/auth`
- **La clave se pide UNA sola vez por teléfono**: la cookie `session` ya no vence a los
  30 días (`src/lib/sesion.ts`, 10 años; el navegador la recorta a ~13 meses por su cuenta).
- 🔴 **`VERSION_SESION`**: al cambiarla, todos los pases viejos dejan de valer y todo el
  mundo entra de nuevo UNA vez. Se subió a `"v2"` con este rediseño, a propósito, para que
  papá vuelva a entrar y vea lo nuevo.
- **Freno de intentos: 5 fallos en 15 minutos cierran la puerta 15 minutos**
  (`src/lib/login-freno.ts`, módulo puro; se guarda en `maaser_login_intentos`).
  Sin la migración **falla ABIERTA**: entra con la clave correcta y no frena a nadie.
- Env var: `APP_PASSWORD` = el PIN

## Propiedades — control de pago por propiedad
- La pantalla principal responde por propiedad: "Pagado hasta diciembre 2026" o "Debe 2 meses · $35,200".
- "Pagado hasta" NO es una tabla: se deriva de `rent_charges` en `src/lib/propiedades-pagos.ts` (módulo puro, con tests).
- Registrar pago (`/propiedades/pagar/[id]` → `POST /api/propiedades/pagos`) tiene dos modos:
  **hasta un mes** (crea los meses que falten) y **por monto** (reparte mes a mes; lo que sobra
  queda como abono del mes siguiente = saldo a favor).
- Un cobro viejo con `status='pagado'` vale como pagado completo aunque `paid_amount` sea 0. No se migra nada.
- ✅ `paid_amount` **ya está aplicada en producción** (medido el 23-sep-2026; `supabase-propiedades-pagos.sql`
  queda como historia).
- 🔴 **Abrir la pantalla NO escribe en la base** (23-sep-2026). Hasta esa fecha, entrar creaba solos los
  cobros del mes: mirar dejaba siete filas nuevas. Los cobros se crean con el botón
  **"Generar cobros del mes"** de la pestaña Cobros.
- ⚠️ El rediseño de Propiedades (sección 4–5 del mockup) **NO entró en este cambio**: se está definiendo.

## Base de datos
- Schema en `supabase-propiedades.sql`
- RLS cerrado: solo `service_role` puede leer/escribir
- Env var: `SUPABASE_SERVICE_ROLE_KEY` requerida
- Tablas: donations, annual_goals, expenses, rent_properties, rent_contracts, rent_charges

## Crons
| Cron | Descripción |
|------|-------------|
| /api/cron/monthly-summary | Resumen mensual de donaciones por email (Resend). **`SUMMARY_EMAIL` acepta VARIOS correos separados por coma.** |
| /api/cron/backup | Respaldo diario a Storage. **Incluye Por Cobrar** (`cxc_clientes`, `cxc_movimientos`) desde el 23-sep-2026 |

## Design System
- Paleta: navy (#1A3A5C), gold (#D4A843), cream (#FAF5E8)
- Fuente: sistema (sans-serif)
- Emojis como iconos de navegación
- Mobile-first: max-w-430px en Propiedades, cards en vez de tablas
- **Texto mínimo 14 px** (los rótulos grises eran de 13 y la barra de pestañas de 10)
- **Botones y enlaces mínimo 44 px de alto**, "← Inicio" y "Salir" incluidos
- Toasts para feedback (éxito verde, error rojo)

## UX
- Usuario principal: papá (60+ años). No es técnico.
- Todo en español simple
- Cards grandes, botones grandes, texto legible
- Confirmación para eliminar, toasts para guardar
- Búsqueda en donaciones y gastos

## Sincronización Maaser/Finanzas <-> MiFinanzas

**REGLA IMPORTANTE:** Cada cambio en el módulo de finanzas DEBE hacerse simultáneamente en:
1. `~/Desktop/APPS/maaser/src/app/finanzas` + `~/Desktop/APPS/maaser/src/components/finanzas` (módulo aquí)
2. `~/Desktop/APPS/mifinanzas` (app independiente)

### Diferencias entre ambas versiones:
| Aspecto | Maaser/Finanzas | MiFinanzas |
|---------|-----------------|-----------|
| Auth | PIN cookie (fetch directo) | username/password (authFetch) |
| User ID | Sin user_id (single user) | user_id en todas las tablas/queries |
| Dark mode | No | Sí |
| Tablas | finance_expenses, finance_categories, finance_budgets, finance_recurring | personal_expenses, categories, category_budgets, recurring_expenses |
| APIs | /api/finanzas/expenses, /api/finanzas/categories, /api/finanzas/budgets, /api/finanzas/recurring | /api/personal-expenses, /api/categories, /api/category-budgets, /api/recurring-expenses |
| Categorías | finance-categories.ts | default-categories.ts (mismo contenido) |

### Al hacer cambios:
1. Implementar el cambio en este proyecto (maaser/finanzas)
2. Copiar/adaptar en mifinanzas agregando user_id, authFetch, y dark mode
3. Verificar build en ambos proyectos

## Changes — April 2026 Session

### UX Audit (10 fixes)
- Catch blocks added to all async operations
- Loading states added where missing
- Touch targets enlarged to 44px minimum
- Scroll lock on modals (body overflow hidden)
- Dead/unused props removed

### API & Reliability
- All API routes have `export const dynamic = 'force-dynamic'`
- Propiedades: charge generate now awaited with error handling
- All fetch calls have try/catch with user-friendly messages

### Attempted & Reverted
- Face ID (WebAuthn): implemented and removed — too unstable on serverless

## Pruebas
```bash
npx vitest run   # 125 pruebas (eran 77)
npx next build   # tiene que pasar antes de subir
```
Los módulos de Maaser son **puros y con prueba**: `fecha-panama` · `montos-frecuentes` ·
`lista-donaciones` · `diezmo` · `anios-con-datos` · `historial-beneficiario` · `renglon` ·
`metodo-pago` · `login-freno`.

## Deploy
```bash
git push origin main   # Auto-deploy via Vercel
```

## Env vars necesarias en Vercel
- `APP_PASSWORD` — PIN de 4 dígitos
- `SUPABASE_SERVICE_ROLE_KEY` — service role key de Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (ya no se usa para escritura)
- `RESEND_API_KEY` — para emails mensuales
- `CRON_SECRET` — protege los endpoints de cron
- `SUMMARY_EMAIL` — a quién llega el resumen mensual. **Varios correos separados por coma.**


## Regla de Calidad
- Todo código debe funcionar a la primera. No pushear sin verificar el flujo completo end-to-end.
- Verificar: datos fluyen escritura → DB → lectura → UI
- Auth en serverless: usar tokens HMAC firmados, NO Maps en memoria
- No hacer fire-and-forget (.then().catch()) para operaciones críticas — siempre await
- useState en useEffect como dependencia puede causar re-renders destructivos — usar useRef para estado interno
- Verificar compatibilidad de formatos antes de integrar (PNG/JPEG en jsPDF, DER/P1363 en WebAuthn)
- Si no puedo probar en browser, simular el flujo con script
