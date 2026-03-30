export function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

const MONTH_ABBR_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatDateExport(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  const monthIdx = parseInt(month, 10) - 1;
  return `${day}-${MONTH_ABBR_ES[monthIdx]}-${year}`;
}
