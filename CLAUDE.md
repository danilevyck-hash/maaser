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
| Maaser | `/maaser` | Donaciones por año hebreo, meta anual, resumen por beneficiario |
| InDriver | `/indriver` | Gastos por mes/año, resumen anual |
| Propiedades | `/propiedades` | Dashboard, CRUD propiedades, contratos, cobros mensuales |
| Finanzas | `/finanzas` | Presupuesto y gastos por categoría |

## Auth
- Login con PIN de 4 dígitos (página `/login`)
- Middleware protege todas las rutas excepto `/login` y `/api/auth`
- Cookie httpOnly `session` con token SHA-256, expira 30 días
- Env var: `APP_PASSWORD` = el PIN

## Base de datos
- Schema en `supabase-propiedades.sql`
- RLS cerrado: solo `service_role` puede leer/escribir
- Env var: `SUPABASE_SERVICE_ROLE_KEY` requerida
- Tablas: donations, annual_goals, expenses, rent_properties, rent_contracts, rent_charges

## Crons
| Cron | Descripción |
|------|-------------|
| /api/cron/monthly-summary | Resumen mensual de donaciones por email (Resend) |

## Design System
- Paleta: navy (#1A3A5C), gold (#D4A843), cream (#FAF5E8)
- Fuente: sistema (sans-serif)
- Emojis como iconos de navegación
- Mobile-first: max-w-430px en Propiedades, cards en vez de tablas
- Text mínimo: text-sm para datos, text-lg para montos
- Botones mínimo 44px touch target
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
- `CRON_SECRET` — protege el endpoint de cron


## Regla de Calidad
- Todo código debe funcionar a la primera. No pushear sin verificar el flujo completo end-to-end.
- Verificar: datos fluyen escritura → DB → lectura → UI
- Auth en serverless: usar tokens HMAC firmados, NO Maps en memoria
- No hacer fire-and-forget (.then().catch()) para operaciones críticas — siempre await
- useState en useEffect como dependencia puede causar re-renders destructivos — usar useRef para estado interno
- Verificar compatibilidad de formatos antes de integrar (PNG/JPEG en jsPDF, DER/P1363 en WebAuthn)
- Si no puedo probar en browser, simular el flujo con script
