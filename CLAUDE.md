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
| Maaser | `/maaser` | **Una sola pantalla.** El total del año, «Anotar», el buscador y la lista corrida de todos los años. Tocando el número se abre el año, mes por mes |
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

## Maaser — historial ordenado y cheque (6-oct-2026) · ✅ PUBLICADO

Daniel: «Aquí en Maaser no veo historial. De manera ordenada quiero poder ver historial
ordenado y número de cheque». Entró detrás de `NEXT_PUBLIC_MAASER_HISTORIAL`
(`src/lib/maaser/interruptores.ts`) y **se prendió el 6-oct-2026 con su sí** sobre las
capturas. **Para apagarlo: `NEXT_PUBLIC_MAASER_HISTORIAL=0`** en Vercel y volver a
publicar — la pantalla vuelve a ser la de antes, byte por byte, sin tocar código. El
candado `maaser-historial.test.tsx` cuida las dos posiciones.

- ✅ **`donations.check_number` YA existe en producción** (medido el 6-oct-2026: 266
  donaciones, 123 con cheque) y «Anotar» ya lo escribe desde el 24-sep. **No hace falta
  ninguna migración**: lo único que faltaba era mostrarlo.
- **El cheque a la vista**: `lineaDeLaFila(d, hoy, { cheque: true })` →
  «22 sep · Cheque 2936 · Esposa enferma», en la lista del inicio y en las filas del año.
  Un cheque **«0000» no se dibuja**: hay dos así en la base y un cheque cero no es un cheque.
- **La línea «5786 · $81,198» se toca** y abre ese año en `ElAnio`. Era un `<p>` muerto:
  por eso él decía que no veía historial. (La pantalla del año ya existía, pero solo se
  llegaba tocando el número grande, sin ninguna pista.)
- **Ordenar** desde el «···»: por fecha (la de siempre, con separadores de año), por monto
  o por nombre (`src/lib/maaser/orden.ts`, módulo puro). Por monto y por nombre son UNA
  lista pareja **sin separadores**, y la fecha **lleva el año** («24 dic 2025») porque
  mezcla años. El empate se rompe por fecha, de la más nueva a la más vieja.
- **El buscador** deja de esconderse con más de 20 donaciones, y vive **debajo de
  «Anotar»**, nunca arriba: el número grande es la respuesta de la pantalla.

✅ **Las migraciones YA están todas aplicadas** (medido el 6-oct-2026 contra
producción). Los `supabase/*.sql` quedan como historia. Ver la tabla «Migraciones
— al día» más abajo.

## Maaser — el duplicado y «para un señor de 70 años» (6-oct-2026)

Daniel: «Al poner un gasto y poner Listo, no sé si pasó o no, se repite» · «No quiero
los 3 puntitos, que sea más intuitivo, más fácil de usar para un señor de 70 años
panameño» · «Revisá todo, cada botón, cada pestaña, el workflow».

### 🔴 El duplicado — ✅ PUBLICADO, sin interruptor (es un error)

**La causa de raíz, en tres partes:**
1. **El botón negro de Anotar son DOS botones pegados** dentro de la misma pastilla:
   «Listo ·» a la izquierda y la fecha a la derecha. Tocar la mitad derecha NO guarda,
   abre el calendario. Ese es literalmente el «toco Listo y no sé si pasó».
2. **`traerDonaciones()` no se esperaba**: se volvía al inicio con el número grande y la
   lista de antes. Ahora se `await`ea ANTES de `setVista`.
3. **El servidor no tenía ninguna protección.**

**Lo que entró:**
- `POST /api/donations` → `laMismaDeHaceUnMomento()`: antes de insertar busca una
  donación IDÉNTICA (día + nombre + monto + cheque) escrita dentro de los últimos
  **60 s** y, si existe, **devuelve esa** sin insertar. Vive en el servidor a propósito:
  por ahí pasan los DOS caminos que escriben donaciones (Anotar y el círculo de un
  compromiso) y también los reintentos del teléfono. **Falla ABIERTA.**
- Mientras guarda, **toda la barra se apaga** (`pointerEvents: none`), no solo «Listo».
- El aviso dice **«Anotado ✓»** / «Guardado ✓» / «Borrado ✓». `cumplirCompromiso` NO
  decía nada al terminar: ahora también avisa.
- «Falta poner cuánto diste» se dibuja **pegado al botón**, no al final del scroll
  (estaba fuera de la pantalla).
- Candado: `src/__tests__/api/donaciones-sin-duplicar.test.ts`.

✅ **Medido en producción el 6-oct-2026, sin borrar nada: CERO duplicados hechos por la
app.** De 266 donaciones, 149 son de la app y 117 de la carga del 22-mar-2026. Los 13
grupos idénticos son TODOS de esa carga (nombre «Donación», sin cheque). El único par
de la app —Rab Joseph Floster, 12-ago-2026, $500 ×2, ids 509 y 510, 97 s de
diferencia— lleva **cheques distintos** (2896 y 2899): son dos donaciones de verdad.

### ✅ `NEXT_PUBLIC_MAASER_SIMPLE` — PUBLICADO el 6-oct-2026

`SIMPLE` en `src/lib/maaser/interruptores.ts`. **Se prendió el 6-oct-2026 con su sí**
sobre las capturas: «aplícalo y lo veo en vivo». La variable está en `1` en Vercel
producción. **Para apagarlo: `NEXT_PUBLIC_MAASER_SIMPLE=0`** y volver a publicar — las
pantallas vuelven a ser BYTE por BYTE las de antes, sin tocar código. Candado:
`maaser-simple.test.tsx` (las dos posiciones). Capturas HOY vs RECOMENDACIÓN a 390 px,
en solo lectura, en `.claude/jobs/c25ab4e9/tmp/maaser-simple/index.html`.

Los tres candados viejos —`maaser-al-abrir`, `maaser-anotar`,
`maaser-compromisos-y-anio`— quedaron al día con las pantallas nuevas: siguen cuidando
lo mismo (la fecha de Panamá, qué se escribe, el compromiso, los doce meses), solo
cambiaron los rótulos. El año gana `data-mes`/`data-total` en cada renglón, como antes
`data-barra`.

- **Se va el «···» de las DOS pantallas.** Ordenar son tres palabras a la vista (Por
  fecha · Por monto · Por nombre). En el año, «Ver cuánto le diste a cada persona» y
  «Guardar la lista para imprimir o para el contador» vuelven a ser renglones.
- **Anotar: UN solo botón** («Listo, anotar», todo el ancho). El día pasa a su propio
  renglón con «Cambiar el día». Título «Nueva donación». Rótulos de 12 px MAYÚSCULAS a
  14 px normales. Cómo pagaste en 2×2 («Transferencia» se salía de 390 px). El cheque
  ya no se escribe solo al enfocar: hay un botón «Poner el 2937».
- **El año, mes por mes en renglones** con el nombre completo. Las doce barras tenían
  rótulos de **9 px** («Tis», «Jes») y no decían ni el mes ni el monto.
- **Inicio:** «Debes dar $X este año · te faltan $Y» en vez de «Meta 10 %», «Ver mes
  por mes ›» bajo el número (era un botón secreto), flecha › en cada fila, buscador
  siempre a la vista, la línea del año a 15 px, y el círculo del compromiso pasa a ser
  un botón que dice **«Anotar»**.
- El paseo de bienvenida sube a `version: 2` cuando el interruptor está prendido: el
  texto viejo hablaba del «···».

✅ **Pantallas muertas, BORRADAS** (6-oct-2026, con su sí): `/maaser/resumen` y
`/maaser/beneficiarios`. Llevaban la paleta vieja (navy/gold), sin encabezado y **sin
botón para salir**; nadie las enlazaba. Con ellas se fue `getAvailableHebrewYears()`,
que solo usaba el resumen. Lo que hacían vive hoy en `ElAnio`: los meses del año y «Ver
cuánto le diste a cada persona».

🔴 **`src/app/not-found.tsx`**: el historial del teléfono todavía abre esas direcciones.
Antes caían en el 404 de fábrica, en inglés y sin salida. Ahora caen en una pantalla en
español con «Ir a Maaser» e «Ir al inicio». Vale para cualquier dirección equivocada.

## Maaser — los cuatro arreglos y la auditoría (6-oct-2026)

Daniel probó el rediseño en vivo. **Los cuatro arreglos van SIN interruptor**
(son arreglos de lo publicado); la auditoría entró **apagada**.

### Los cuatro arreglos · ✅ PUBLICADOS

1. **La fecha de cada mes, en español y completa.** `rangoEnPalabras()` en
   `fecha-en-palabras.ts`: «Del 12 de septiembre al 11 de octubre de 2026», y
   los DOS años cuando el mes cruza («Del 11 de diciembre de 2026 al 8 de enero
   de 2027»). El `label` de `hebrew-year.ts` («23 sep – 22 oct») queda para el
   estado apagado.
2. **Se siente al abrir un mes.** Fondo `#F2F2F7`, barra azul de 3 px a la
   izquierda (`boxShadow: inset`), nombre en negrita, la flecha gira 90° y las
   filas entran con `.animate-desplegar` (0.18 s, en `globals.css`).
   🔴 **Un mes con 0 donaciones ya NO es un botón**: es un `<div>`. Tocarlo no
   hacía nada y parecía que la app se trababa. Conserva `data-mes`/`data-total`.
3. **El número de cheque SOLO si la forma de pago es cheque.** «Cómo pagaste»
   pasó ARRIBA del campo; `pideCheque = chip === "Cheque" || (editando && cheque)`.
   Elegir otro método BORRA el número. Al abrir una donación vieja con número y
   `metodo` NULL, el chip «Con cheque» se marca solo: **un cheque guardado dice
   que se pagó con cheque** (no se inventa, se lee del dato).
   ⚠️ **Medido: las 266 donaciones tienen `metodo` en NULL.** Nadie tocó nunca
   esos botones; el método se escribe a mano en la nota («Tarjeta», «Yappy»,
   «TRANFERENCIA», «Ach»). Si papá no encuentra el campo del cheque detrás de
   «Con cheque», el plan B es dejarlo siempre a la vista.
4. **El día, de UN SOLO TOQUE.** El renglón es un `<label>` con un
   `<input type="date">` invisible encima (`absolute inset-0 opacity-0`): el
   calendario del teléfono se abre al tocar cualquier parte del renglón. Se fue
   la hoja de abajo (vive solo con el interruptor apagado). **«Volver a hoy»
   solo al anotar una nueva**, nunca al cambiar una vieja: ahí mandaría una
   donación de septiembre a octubre.

### 🔴 Los «compromisos mensuales» SE FUERON (con su sí)

**Medido el 6-oct-2026: `maaser_compromisos` existe en producción y tiene CERO
filas.** Desde el 24-sep nadie creó uno solo. Daniel: «no sé, ¿se usa? ¿qué
compromisos?» → «dale, quítalos si están vacíos».

Se borraron: `src/lib/maaser/compromisos.ts`, `src/app/api/maaser/compromisos/`,
el interruptor «Se repite cada mes» de Anotar, la línea de pendientes del
inicio, su botón «Anotar», la hoja «Ya no se repite», el dibujo `m-repite` y su
página del paseo de bienvenida. `LoQueSeGuarda` ya no lleva `repetirCadaMes`.
El candado `maaser-compromisos-y-anio.test.tsx` pasó a `maaser-el-anio.test.tsx`.

⚠️ **La tabla NO se borró**: sigue en la base, vacía. Lo que se fue es la
pantalla. Para volver, hay que reescribir la ruta y la UI.

### ✅ `NEXT_PUBLIC_MAASER_AUDITORIA` — PRENDIDO el 6-oct-2026

`AUDITORIA` en `interruptores.ts`. Nació apagado como propuesta y **se prendió
el mismo día con su sí** («lo demás de la auditoría está aprobado: empezá a
aplicarlo»). **Para apagarlo: `NEXT_PUBLIC_MAASER_AUDITORIA=0`** y volver a
publicar — las pantallas vuelven a ser BYTE por BYTE las de la mañana. Candados:
`maaser-auditoria.test.tsx` (las dos posiciones) y `orden-y-cheque.test.ts`
(el módulo puro). Capturas ANTES vs AHORA en
`.claude/jobs/c25ab4e9/tmp/maaser-audit/index.html` (56 a 390 px, solo lectura).

**Los dos ajustes que pidió sobre la auditoría:**
- **Las fechas, cortas.** `rangoEnPalabras()` → «12 sep – 11 oct»; el año SOLO
  cuando el mes cruza («11 dic 2026 – 8 ene 2027»). La versión larga («Del 12 de
  septiembre…») duró medio día: «más minimalista».
- **Manda el MONTO.** `src/components/maaser/FilaDonacion.tsx` (nuevo, lo usan
  el inicio y el año): arriba cuándo fue y el cheque EN NEGRO; abajo, en gris y
  a 14 px, a quién y por qué; a la derecha el monto a 20 px en negrita
  (`MONTO_FUERTE`). Daniel: «nada de "rab gil", pon nombre o motivo en gris».

**Lo demás que entró con el interruptor:**
- **Buscar por número de cheque** (`filtrarPorNombreOCheque`): un texto de puros
  números busca también el cheque. «Buscar un nombre o un cheque».
- **El gasto anual se cambia DESDE la pantalla**: la línea «Debes dar $X este
  año» se toca y abre la hoja «Gasto anual · 5787» → `PUT /api/goal`. Sin el
  dato, la línea dice «Poner el gasto anual» (antes no se dibujaba NADA). El
  10 % y «te faltan» se recalculan solos: la línea se deriva del dato.
  🔴 El rótulo es **«Gasto anual»**, no «Meta 10 %»: lo que se escribe es lo que
  gasta, el maaser es el resultado.
- **«Guardar los cambios»** al cambiar una donación, y la hoja de borrar dice
  QUÉ borra (nombre · monto · día).
- **«Cuánto le diste a cada persona»**: un solo «‹» (el de arriba vuelve al
  año), su título y la flecha en cada fila.

### Lo que entró SIN interruptor (son arreglos, no diseño)

- **Un solo botón para Yappy y transferencia** (`CHIPS_METODO`): eran dos que
  guardaban `transferencia`. Ahora «Yappy o transferencia», a todo el ancho (el
  último de tres en una rejilla de dos lleva `col-span-2`). `METODOS_PAGO` usa
  el mismo nombre. **Las donaciones viejas no cambian de valor.**
- **Los avisos rojos dicen qué hacer**: «No se pudo guardar. Revisa el internet
  y vuelve a tocar «Listo, anotar». **No se perdió nada**.»
- **`ExportModal` con la cara del resto de la app**: era lo último con botón
  verde, botón azul, fondo gris y fechas en números. Título «Guardar la lista»,
  «Otras fechas» en vez de «Personalizado», PDF como acción principal.
- **El login dice cuántos intentos quedan** y cuántos minutos dura el freno: el
  servidor ya lo mandaba (`intentosRestantes`, 429) y la pantalla lo tiraba.
- **«Salir» pregunta** antes de borrar el pase (`src/app/page.tsx`).
- 🔴 **La app se sigue llamando «Mis Registros»** en la puerta y en el inicio:
  es el nombre del manifest y del ícono del teléfono. Ponerle «Maaser» sería
  ponerle a la puerta el nombre de uno de los cinco módulos. Si se decide
  renombrar, hay que tocar también `public/manifest.json` y `layout.tsx`.

## Maaser — los meses que todavía no llegaron (7-oct-2026)

### ✅ `NEXT_PUBLIC_MAASER_MESES` — PRENDIDO el 7-oct-2026

`MESES_POR_LLEGAR` en `interruptores.ts`. Nació apagado como propuesta y **se
prendió con su sí** («Daniel aprobó la línea única»). La variable está en `1` en
Vercel producción. **Para apagarlo: borrarla o ponerla en `0`** y volver a
publicar — la pantalla del año vuelve a ser BYTE por BYTE la de antes, sin tocar
código. Candado: `maaser-meses-por-llegar.test.tsx` (las dos posiciones).

**El problema:** un año recién empezado son TRECE renglones iguales de «No diste
nada este mes» —5787 es bisiesto (Adar I y Adar II)— incluidos los meses que
todavía no llegaron. Eso es ruido: nadie pudo haber dado nada en un mes que no
existe aún.

- **Los meses de la COLA que no llegaron se juntan en UNA línea gris**:
  «Jeshván a Elul · todavía no llegaron» (`lineaPorLlegar()`). Con uno solo,
  «todavía no llegó», en singular. Es texto, no un botón: no hay nada que abrir
  y no lleva monto.
- 🔴 **El mes QUE CORRE nunca se esconde, ni en cero**: ahí el cero es
  información de verdad (ese mes ya empezó y no se dio nada). `mesesPorLlegar()`
  en `anio-en-barras.ts` solo se come la cola, mes a mes desde el final, mientras
  `desde > hoy` **y** `cantidad === 0`; si un mes de más adelante ya tiene una
  donación con fecha futura, se corta ahí y ese mes sigue siendo su renglón.
- **Un año ya cerrado no cambia**: 5786 sigue mes por mes, sus doce renglones.
- `hoy` es la fecha de **Panamá** (`hoyPanamaISO()`), como todo lo que dice «hoy».

### Migraciones — al día (medido el 6-oct-2026, en producción)

| Tabla / columna | Estado |
|---|---|
| `donations.check_number` | ✅ existe · 123 de 266 con número |
| `donations.metodo` | ✅ existe · **266 en NULL: nadie la usa** |
| `annual_goals.gastos_anuales` | ✅ existe · 5787 = $800,000 · **ya se edita desde la pantalla** |
| `maaser_login_intentos` | ✅ existe · vacía (el freno funciona) |
| `maaser_compromisos` | ✅ existe · **vacía, sin pantalla desde el 6-oct** |

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
npx vitest run   # 241 pruebas
npx next build   # tiene que pasar antes de subir
```
Los módulos de Maaser son **puros y con prueba**: `fecha-panama` · `montos-frecuentes` ·
`lista-donaciones` · `diezmo` · `anios-con-datos` · `historial-beneficiario` · `renglon` ·
`metodo-pago` · `login-freno` · `orden`.

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
