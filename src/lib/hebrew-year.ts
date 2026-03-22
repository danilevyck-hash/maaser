// Lightweight Hebrew calendar calculations — no external dependencies.
// Uses the "Four Gates" algorithm to compute Rosh Hashana dates
// and derives month lengths from the year type.

export type HebrewMonth = {
  name: string;
  startDate: string;
  endDate: string;
  label: string;
};

export type HebrewYearData = {
  hebrewYear: number;
  startDate: string;
  endDate: string;
  months: HebrewMonth[];
};

const GREG_MONTH_ABBR = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// ---- Core algorithm: Hebrew Day Number (absolute date) of 1 Tishrei ----

function hebrewNewYearDelay(year: number): number {
  // Months from molad of creation to Tishrei of year
  const monthsElapsed =
    Math.floor((235 * (year - 1) + 1) / 19);
  const partsElapsed = 12084 + 13753 * monthsElapsed;
  const day = 1 + 29 * monthsElapsed + Math.floor(partsElapsed / 25920);
  const parts = partsElapsed % 25920;

  // Postponement rules (dehiyot)
  let alt = day;
  const dow = day % 7;

  // Lo ADU: Rosh Hashana can't fall on Sun(1), Wed(4), Fri(6)
  if (dow === 0 || dow === 3 || dow === 5) {
    alt = day + 1;
  }
  // Molad zaken: if molad is at noon or later, postpone
  else if (parts >= 19440) {
    alt = day + 1;
    const newDow = alt % 7;
    if (newDow === 0 || newDow === 3 || newDow === 5) {
      alt++;
    }
  }
  // GaTRaD: after leap year
  else if (
    !isHebrewLeapYear(year) &&
    dow === 2 &&
    parts >= 9924
  ) {
    alt = day + 2;
  }
  // BeTUTeKPaT: year after leap year
  else if (
    isHebrewLeapYear(year - 1) &&
    dow === 1 &&
    parts >= 16789
  ) {
    alt = day + 1;
  }

  return alt;
}

function isHebrewLeapYear(year: number): boolean {
  return ((7 * year + 1) % 19) < 7;
}

/**
 * Get the Gregorian date of 1 Tishrei for a given Hebrew year.
 */
function roshHashanaGregorian(hebrewYear: number): Date {
  const dayOfThisYear = hebrewNewYearDelay(hebrewYear);
  // Hebrew epoch: 1 Tishrei 1 = September 7, 3761 BCE (Julian) = RD -1373427
  // But simpler: anchor to a known date.
  // 1 Tishrei 5765 = September 16, 2004 (Thursday), absolute day offset = ...
  // Use: absolute day of 1 Tishrei hebrewYear, then convert via anchor.
  const anchor = hebrewNewYearDelay(5765); // 1 Tishrei 5765
  const anchorGreg = new Date(Date.UTC(2004, 8, 16)); // Sep 16, 2004
  const diff = dayOfThisYear - anchor;
  return new Date(anchorGreg.getTime() + diff * 86400000);
}

function hebrewYearLength(hebrewYear: number): number {
  return hebrewNewYearDelay(hebrewYear + 1) - hebrewNewYearDelay(hebrewYear);
}

/**
 * Get month lengths for a Hebrew year.
 * Returns array of { name, days } from Tishrei to Elul.
 */
function getMonthLengths(hebrewYear: number): { name: string; days: number }[] {
  const yearLen = hebrewYearLength(hebrewYear);
  const leap = isHebrewLeapYear(hebrewYear);

  // Cheshvan and Kislev vary based on year length
  // Regular (353/383): Cheshvan=29, Kislev=29
  // Complete (355/385): Cheshvan=30, Kislev=30
  // Deficient(354/384): Cheshvan=29, Kislev=30
  const regularLen = leap ? 383 : 353;
  const cheshvan = (yearLen - regularLen >= 2) ? 30 : 29;
  const kislev = (yearLen - regularLen >= 1) ? 30 : 29;

  const months: { name: string; days: number }[] = [
    { name: "Tishrei", days: 30 },
    { name: "Jeshván", days: cheshvan },
    { name: "Kislev", days: kislev },
    { name: "Tévet", days: 29 },
    { name: "Shvat", days: 30 },
  ];

  if (leap) {
    months.push({ name: "Adar I", days: 30 });
    months.push({ name: "Adar II", days: 29 });
  } else {
    months.push({ name: "Adar", days: 29 });
  }

  months.push(
    { name: "Nisán", days: 30 },
    { name: "Iyar", days: 29 },
    { name: "Siván", days: 30 },
    { name: "Tamuz", days: 29 },
    { name: "Av", days: 30 },
    { name: "Elul", days: 29 },
  );

  return months;
}

// ---- Helpers ----

function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

function formatLabel(start: Date, end: Date): string {
  const s = `${start.getUTCDate()} ${GREG_MONTH_ABBR[start.getUTCMonth()]}`;
  const e = `${end.getUTCDate()} ${GREG_MONTH_ABBR[end.getUTCMonth()]}`;
  return `${s} – ${e}`;
}

// ---- Cache ----
const yearCache = new Map<number, HebrewYearData>();
let _currentYear: number | null = null;
let _currentMonth: { from: string; to: string; name: string } | null = null;

// ---- Public API ----

export function getHebrewYearData(hebrewYear: number): HebrewYearData {
  const cached = yearCache.get(hebrewYear);
  if (cached) return cached;

  const rh = roshHashanaGregorian(hebrewYear);
  const nextRh = roshHashanaGregorian(hebrewYear + 1);
  const endDate = addDays(nextRh, -1);

  const monthLengths = getMonthLengths(hebrewYear);
  let cursor = rh;

  const months: HebrewMonth[] = monthLengths.map((m) => {
    const start = cursor;
    const end = addDays(cursor, m.days - 1);
    cursor = addDays(cursor, m.days);
    return {
      name: m.name,
      startDate: toISO(start),
      endDate: toISO(end),
      label: formatLabel(start, end),
    };
  });

  const data: HebrewYearData = {
    hebrewYear,
    startDate: toISO(rh),
    endDate: toISO(endDate),
    months,
  };

  yearCache.set(hebrewYear, data);
  return data;
}

export function getCurrentHebrewYear(): number {
  if (_currentYear !== null) return _currentYear;
  const today = new Date().toISOString().split("T")[0];
  // Check years around the expected range
  const gYear = new Date().getFullYear();
  const approx = gYear + 3760;
  for (const hy of [approx + 1, approx]) {
    const data = getHebrewYearData(hy);
    if (today >= data.startDate && today <= data.endDate) {
      _currentYear = hy;
      return hy;
    }
  }
  _currentYear = approx;
  return approx;
}

export function getAvailableHebrewYears(): number[] {
  const current = getCurrentHebrewYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 3; y--) {
    years.push(y);
  }
  return years;
}

export function getCurrentHebrewMonthRange(): { from: string; to: string; name: string } {
  if (_currentMonth !== null) return _currentMonth;
  const today = new Date().toISOString().split("T")[0];
  const yearData = getHebrewYearData(getCurrentHebrewYear());
  for (const m of yearData.months) {
    if (today >= m.startDate && today <= m.endDate) {
      _currentMonth = { from: m.startDate, to: m.endDate, name: m.name };
      return _currentMonth;
    }
  }
  // Fallback: first month
  const first = yearData.months[0];
  _currentMonth = { from: first.startDate, to: first.endDate, name: first.name };
  return _currentMonth;
}
