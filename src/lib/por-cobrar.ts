import { CxcMovimiento } from "@/lib/supabase";
import { MONTH_NAMES } from "@/lib/format";

function fmtMoney(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DATE_FMT_ES = new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long" });

function formatFechaLarga(d: Date): string {
  return DATE_FMT_ES.format(d).replace(" de ", " de ");
}

const MONTH_ABBR_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatFechaCorta(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d, 10)} ${MONTH_ABBR_ES[parseInt(m, 10) - 1]}`;
}

export function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  return { year: y, month: m, day: d };
}

export function calcBalance(movs: CxcMovimiento[]): number {
  let bal = 0;
  for (const m of movs) {
    const signo = m.tipo === "cargo" ? 1 : -1;
    bal += signo * Number(m.monto);
  }
  return Math.round(bal * 100) / 100;
}

export function groupMovimientosPorMes(movs: CxcMovimiento[]): Array<{
  key: string;
  label: string;
  movs: CxcMovimiento[];
}> {
  const groups = new Map<string, { label: string; movs: CxcMovimiento[] }>();
  for (const m of movs) {
    const { year, month } = parseDate(m.fecha);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[month - 1].toUpperCase()} ${year}`;
    if (!groups.has(key)) groups.set(key, { label, movs: [] });
    groups.get(key)!.movs.push(m);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, label: v.label, movs: v.movs }));
}

export function cleanPhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function buildWhatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildEstadoCuenta(nombre: string, movs: CxcMovimiento[]): string {
  const totalCargos = movs.filter((m) => m.tipo === "cargo").reduce((s, m) => s + Number(m.monto), 0);
  const totalAbonos = movs.filter((m) => m.tipo === "abono").reduce((s, m) => s + Number(m.monto), 0);
  const totalAjustes = movs.filter((m) => m.tipo === "ajuste").reduce((s, m) => s + Number(m.monto), 0);
  const balanceFinal = Math.round((totalCargos - totalAbonos - totalAjustes) * 100) / 100;

  const hoyStr = formatFechaLarga(new Date());

  if (balanceFinal === 0) {
    return `Hola ${nombre}, tu cuenta está al día. Gracias! 🙏`;
  }

  const lines: string[] = [];
  lines.push(`Hola ${nombre}, te paso tu estado de cuenta:`);
  lines.push("");
  lines.push(`Debe: ${fmtMoney(totalCargos)}`);
  if (totalAbonos > 0) {
    lines.push(`Pagó: ${fmtMoney(totalAbonos)}`);
  }
  lines.push("");
  lines.push(`*Saldo pendiente: ${fmtMoney(balanceFinal)}*`);
  lines.push("");
  lines.push(`Al ${hoyStr}.`);

  return lines.join("\n");
}
