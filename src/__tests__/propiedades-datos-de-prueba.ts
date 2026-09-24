/**
 * Las siete propiedades REALES de papá, medidas contra producción el
 * 24-sep-2026 (nombres, montos, inquilinos, celulares y fechas de contrato).
 *
 * Los cobros son un recorte a propósito, para que la pantalla diga
 * «2 de 7 · $3,700 · te deben $1,300», que es el caso del mockup.
 */

export const PROPIEDADES = [
  { id: 5, name: "Marquis 7A", location: "Cangrejo", type: "residencial", icon: "🏠", rent_amount: 800 },
  { id: 6, name: "Brisa Marina", location: "Paitilla piso 5B", type: "residencial", icon: "🏠", rent_amount: 1500 },
  { id: 7, name: "Parque Marbella", location: "Marbella piso 9B", type: "residencial", icon: "🏠", rent_amount: 1000 },
  { id: 8, name: "Torre del Pacífico", location: "Marbella piso 18A", type: "residencial", icon: "🏠", rent_amount: 1430 },
  { id: 9, name: "Brisa Marbella", location: "Marbella piso 10A", type: "residencial", icon: "🏠", rent_amount: 1300 },
  { id: 10, name: "Crillón", location: "Paitilla. Piso 4A", type: "residencial", icon: "🏠", rent_amount: 2200 },
  { id: 11, name: "Terreno Carrasquilla", location: "Carrasquilla", type: "residencial", icon: "🏠", rent_amount: 1815 },
];

export const CONTRATOS = [
  { id: 2, property_id: 5, tenant_name: "David Harmodio", tenant_phone: "68867153", start_date: "2021-07-02", end_date: "2027-06-30", rent_amount: 800, active: true },
  { id: 3, property_id: 6, tenant_name: "Moisés Waisberg", tenant_phone: "+507 6168-3210", start_date: "2020-07-30", end_date: "2027-03-30", rent_amount: 1500, active: true },
  { id: 4, property_id: 7, tenant_name: "Ana María", tenant_phone: "+507 6570 0512", start_date: "2020-01-30", end_date: "2027-03-30", rent_amount: 1000, active: true },
  { id: 5, property_id: 8, tenant_name: "Janibeth Miranda", tenant_phone: "+507 6980-5035", start_date: "2023-01-30", end_date: "2027-03-30", rent_amount: 1430, active: true },
  { id: 6, property_id: 9, tenant_name: "SEBASTIÁN", tenant_phone: "+507 6917-4827", start_date: "2021-11-30", end_date: "2027-03-31", rent_amount: 1300, active: true },
  { id: 7, property_id: 10, tenant_name: "José", tenant_phone: "+507 6732-1687", start_date: "2026-01-01", end_date: "2027-03-31", rent_amount: 2200, active: true },
  { id: 8, property_id: 11, tenant_name: "Javed", tenant_phone: "+507 6612-6162", start_date: "2020-01-31", end_date: "2027-03-31", rent_amount: 1815, active: true },
];

/** Crillón cobró 8 meses por adelantado el 12-may-2026: jun-2026 → ene-2027. */
export const COBROS = [
  { id: 101, property_id: 6, contract_id: 3, tenant_name: "Moisés Waisberg", month: "2026-09", amount: 1500, status: "pagado", due_date: "2026-09-01", paid_date: "2026-09-03" },
  { id: 102, property_id: 10, contract_id: 7, tenant_name: "José", month: "2026-09", amount: 2200, status: "pagado", due_date: "2026-09-01", paid_date: "2026-05-12" },
  { id: 103, property_id: 10, contract_id: 7, tenant_name: "José", month: "2026-10", amount: 2200, status: "pagado", due_date: "2026-10-01", paid_date: "2026-05-12" },
  { id: 104, property_id: 10, contract_id: 7, tenant_name: "José", month: "2026-11", amount: 2200, status: "pagado", due_date: "2026-11-01", paid_date: "2026-05-12" },
  { id: 105, property_id: 10, contract_id: 7, tenant_name: "José", month: "2026-12", amount: 2200, status: "pagado", due_date: "2026-12-01", paid_date: "2026-05-12" },
  { id: 106, property_id: 10, contract_id: 7, tenant_name: "José", month: "2027-01", amount: 2200, status: "pagado", due_date: "2027-01-01", paid_date: "2026-05-12" },
  // Papá dijo «no pagó»: esto, y solo esto, es deuda.
  { id: 110, property_id: 9, contract_id: 6, tenant_name: "SEBASTIÁN", month: "2026-08", amount: 1300, status: "no_pago", due_date: "2026-08-01", paid_date: null },
  // Filas viejas que el sistema creó solo: NO son deuda.
  { id: 111, property_id: 5, contract_id: 2, tenant_name: "David Harmodio", month: "2026-08", amount: 800, status: "mora", due_date: "2026-08-01", paid_date: null },
  { id: 112, property_id: 7, contract_id: 4, tenant_name: "Ana María", month: "2026-09", amount: 1000, status: "pendiente", due_date: "2026-09-01", paid_date: null },
  { id: 113, property_id: 9, contract_id: 6, tenant_name: "SEBASTIÁN", month: "2026-04", amount: 1300, status: "pagado", due_date: "2026-04-01", paid_date: "2026-04-22" },
];
