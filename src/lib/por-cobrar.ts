import { CxcMovimiento } from "@/lib/supabase";
import { MONTH_NAMES } from "@/lib/format";

const MONTH_ABBR_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function fmtMoney(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const cargos = movs.filter((m) => m.tipo === "cargo");
  const abonos = movs.filter((m) => m.tipo === "abono");
  const ajustes = movs.filter((m) => m.tipo === "ajuste");

  const cargosPorMes = new Map<string, { year: number; month: number; total: number }>();
  for (const c of cargos) {
    const { year, month } = parseDate(c.fecha);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const entry = cargosPorMes.get(key) || { year, month, total: 0 };
    entry.total += Number(c.monto);
    cargosPorMes.set(key, entry);
  }
  const mesesOrdenados = Array.from(cargosPorMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  const totalCargos = cargos.reduce((s, m) => s + Number(m.monto), 0);
  const totalAbonos = abonos.reduce((s, m) => s + Number(m.monto), 0);
  const totalAjustes = ajustes.reduce((s, m) => s + Number(m.monto), 0);
  const balancePostAbonos = totalCargos - totalAbonos;
  const balanceFinal = balancePostAbonos - totalAjustes;

  const lines: string[] = [];
  lines.push(`*Estado de cuenta — ${nombre}*`);
  lines.push("");

  for (const { year, month, total } of mesesOrdenados) {
    const mesNombre = MONTH_NAMES[month - 1];
    lines.push(`${mesNombre} ${year}      ${fmtMoney(total)}`);
  }
  lines.push("─────────────────");
  lines.push(`*Total*           ${fmtMoney(totalCargos)}`);
  lines.push("");

  if (abonos.length > 0) {
    lines.push("*Abonos:*");
    const abonosOrdenados = [...abonos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    for (const a of abonosOrdenados) {
      const { month, day } = parseDate(a.fecha);
      lines.push(`${String(day).padStart(2, "0")} ${MONTH_ABBR_ES[month - 1]}          -${fmtMoney(Number(a.monto))}`);
    }
    lines.push("");
  }

  lines.push(`*Balance*         ${fmtMoney(balancePostAbonos)}`);
  if (ajustes.length > 0) {
    lines.push(`Ajuste            -${fmtMoney(totalAjustes)}`);
  }
  lines.push("─────────────────");
  lines.push(`*Balance actual: ${fmtMoney(balanceFinal)}*`);
  lines.push("");

  const hoy = new Date();
  const hoyDia = String(hoy.getDate()).padStart(2, "0");
  const hoyMes = MONTH_ABBR_ES[hoy.getMonth()];
  const hoyAno = hoy.getFullYear();
  lines.push(`_Al ${hoyDia} ${hoyMes} ${hoyAno}_`);

  return lines.join("\n");
}
