export function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Returns YYYY-MM-DD in the user's local timezone (not UTC).
// Using new Date().toISOString() shifts the date by 1 day for users west of UTC
// (Panama UTC-5: at 7pm local on Apr 4, toISOString returns Apr 5).
export function todayLocalISO(): string {
  return localISO(new Date());
}

export function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function toISODate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split("/");
  return `${year}-${month}-${day}`;
}

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MONTH_ABBR_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  const monthIdx = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${MONTH_ABBR_ES[monthIdx]} ${year}`;
}

export function formatDateExport(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  const monthIdx = parseInt(month, 10) - 1;
  return `${day}-${MONTH_ABBR_ES[monthIdx]}-${year}`;
}
