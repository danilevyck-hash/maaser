import { HDate, months as M } from "@hebcal/core";

export type HebrewMonth = {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // e.g. "23 sep – 22 oct"
};

export type HebrewYearData = {
  hebrewYear: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  months: HebrewMonth[];
};

// Hebrew month names in Spanish, ordered Tishrei → Elul
const MONTH_NAMES_ES: Record<number, string> = {
  [M.TISHREI]: "Tishrei",
  [M.CHESHVAN]: "Jeshván",
  [M.KISLEV]: "Kislev",
  [M.TEVET]: "Tévet",
  [M.SHVAT]: "Shvat",
  [M.ADAR_I]: "Adar I",
  [M.ADAR_II]: "Adar II",
  [M.NISAN]: "Nisán",
  [M.IYYAR]: "Iyar",
  [M.SIVAN]: "Siván",
  [M.TAMUZ]: "Tamuz",
  [M.AV]: "Av",
  [M.ELUL]: "Elul",
};

const GREGORIAN_MONTH_ABBR = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatLabel(start: Date, end: Date): string {
  const s = `${start.getUTCDate()} ${GREGORIAN_MONTH_ABBR[start.getUTCMonth()]}`;
  const e = `${end.getUTCDate()} ${GREGORIAN_MONTH_ABBR[end.getUTCMonth()]}`;
  return `${s} – ${e}`;
}

/**
 * Get the ordered list of Hebrew month numbers for a given year.
 * Runs Tishrei → Elul, handling leap years (Adar I + Adar II).
 */
function getMonthOrder(hebrewYear: number): number[] {
  const isLeap = HDate.isLeapYear(hebrewYear);
  const order: number[] = [M.TISHREI, M.CHESHVAN, M.KISLEV, M.TEVET, M.SHVAT];
  if (isLeap) {
    order.push(M.ADAR_I as number, M.ADAR_II as number);
  } else {
    order.push(M.ADAR_II as number); // Regular Adar uses ADAR_II in hebcal
  }
  order.push(M.NISAN, M.IYYAR, M.SIVAN, M.TAMUZ, M.AV, M.ELUL);
  return order;
}

/**
 * Dynamically compute Hebrew year data using @hebcal/core.
 * Works for any year — past, present, or future.
 */
export function getHebrewYearData(hebrewYear: number): HebrewYearData {
  const roshHashana = new HDate(1, M.TISHREI, hebrewYear).greg();
  const nextRoshHashana = new HDate(1, M.TISHREI, hebrewYear + 1).greg();
  const endDate = new Date(nextRoshHashana.getTime() - 86400000); // day before next RH

  const monthOrder = getMonthOrder(hebrewYear);
  const hebrewMonths: HebrewMonth[] = monthOrder.map((m, i) => {
    const firstDay = new HDate(1, m, hebrewYear).greg();
    const daysInMonth = HDate.daysInMonth(m, hebrewYear);
    const lastDay = new HDate(daysInMonth, m, hebrewYear).greg();

    let name = MONTH_NAMES_ES[m] || `Month ${m}`;
    // For non-leap years, show "Adar" instead of "Adar II"
    if (m === M.ADAR_II && !HDate.isLeapYear(hebrewYear)) {
      name = "Adar";
    }

    return {
      name,
      startDate: toISO(firstDay),
      endDate: toISO(lastDay),
      label: formatLabel(firstDay, lastDay),
    };
  });

  return {
    hebrewYear,
    startDate: toISO(roshHashana),
    endDate: toISO(endDate),
    months: hebrewMonths,
  };
}

/**
 * Get the current Hebrew year based on today's date.
 */
export function getCurrentHebrewYear(): number {
  return new HDate().getFullYear();
}

/**
 * Get available Hebrew years for the year selector (range around current).
 */
export function getAvailableHebrewYears(): number[] {
  const current = getCurrentHebrewYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 3; y--) {
    years.push(y);
  }
  return years;
}

/**
 * Get the current Hebrew month's Gregorian date range.
 */
export function getCurrentHebrewMonthRange(): { from: string; to: string; name: string } {
  const today = new HDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new HDate(1, month, year).greg();
  const daysInMonth = HDate.daysInMonth(month, year);
  const lastDay = new HDate(daysInMonth, month, year).greg();

  let name = MONTH_NAMES_ES[month] || `Month ${month}`;
  if (month === M.ADAR_II && !HDate.isLeapYear(year)) {
    name = "Adar";
  }

  return {
    from: toISO(firstDay),
    to: toISO(lastDay),
    name,
  };
}
