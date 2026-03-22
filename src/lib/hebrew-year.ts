// Hebrew year data: Rosh Hashana start dates and Hebrew month ranges
// Each Hebrew year runs from Rosh Hashana to the day before the next Rosh Hashana

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

// Known Hebrew year data (add more years as needed)
const HEBREW_YEARS: Record<number, HebrewYearData> = {
  5785: {
    hebrewYear: 5785,
    startDate: "2024-10-03",
    endDate: "2025-09-22",
    months: [
      { name: "Tishrei", startDate: "2024-10-03", endDate: "2024-11-01", label: "3 oct – 1 nov" },
      { name: "Jeshván", startDate: "2024-11-02", endDate: "2024-11-30", label: "2 nov – 30 nov" },
      { name: "Kislev", startDate: "2024-12-01", endDate: "2024-12-30", label: "1 dic – 30 dic" },
      { name: "Tévet", startDate: "2024-12-31", endDate: "2025-01-29", label: "31 dic – 29 ene" },
      { name: "Shvat", startDate: "2025-01-30", endDate: "2025-02-27", label: "30 ene – 27 feb" },
      { name: "Adar", startDate: "2025-02-28", endDate: "2025-03-29", label: "28 feb – 29 mar" },
      { name: "Nisán", startDate: "2025-03-30", endDate: "2025-04-28", label: "30 mar – 28 abr" },
      { name: "Iyar", startDate: "2025-04-29", endDate: "2025-05-27", label: "29 abr – 27 may" },
      { name: "Siván", startDate: "2025-05-28", endDate: "2025-06-25", label: "28 may – 25 jun" },
      { name: "Tamuz", startDate: "2025-06-26", endDate: "2025-07-25", label: "26 jun – 25 jul" },
      { name: "Av", startDate: "2025-07-26", endDate: "2025-08-23", label: "26 jul – 23 ago" },
      { name: "Elul", startDate: "2025-08-24", endDate: "2025-09-22", label: "24 ago – 22 sep" },
    ],
  },
  5786: {
    hebrewYear: 5786,
    startDate: "2025-09-23",
    endDate: "2026-09-10",
    months: [
      { name: "Tishrei", startDate: "2025-09-23", endDate: "2025-10-22", label: "23 sep – 22 oct" },
      { name: "Jeshván", startDate: "2025-10-23", endDate: "2025-11-20", label: "23 oct – 20 nov" },
      { name: "Kislev", startDate: "2025-11-21", endDate: "2025-12-20", label: "21 nov – 20 dic" },
      { name: "Tévet", startDate: "2025-12-21", endDate: "2026-01-19", label: "21 dic – 19 ene" },
      { name: "Shvat", startDate: "2026-01-20", endDate: "2026-02-17", label: "20 ene – 17 feb" },
      { name: "Adar", startDate: "2026-02-18", endDate: "2026-03-19", label: "18 feb – 19 mar" },
      { name: "Nisán", startDate: "2026-03-20", endDate: "2026-04-17", label: "20 mar – 17 abr" },
      { name: "Iyar", startDate: "2026-04-18", endDate: "2026-05-16", label: "18 abr – 16 may" },
      { name: "Siván", startDate: "2026-05-17", endDate: "2026-06-14", label: "17 may – 14 jun" },
      { name: "Tamuz", startDate: "2026-06-15", endDate: "2026-07-13", label: "15 jun – 13 jul" },
      { name: "Av", startDate: "2026-07-14", endDate: "2026-08-11", label: "14 jul – 11 ago" },
      { name: "Elul", startDate: "2026-08-12", endDate: "2026-09-10", label: "12 ago – 10 sep" },
    ],
  },
  5787: {
    hebrewYear: 5787,
    startDate: "2026-09-11",
    endDate: "2027-10-01",
    months: [
      { name: "Tishrei", startDate: "2026-09-11", endDate: "2026-10-10", label: "11 sep – 10 oct" },
      { name: "Jeshván", startDate: "2026-10-11", endDate: "2026-11-09", label: "11 oct – 9 nov" },
      { name: "Kislev", startDate: "2026-11-10", endDate: "2026-12-09", label: "10 nov – 9 dic" },
      { name: "Tévet", startDate: "2026-12-10", endDate: "2027-01-08", label: "10 dic – 8 ene" },
      { name: "Shvat", startDate: "2027-01-09", endDate: "2027-02-06", label: "9 ene – 6 feb" },
      { name: "Adar", startDate: "2027-02-07", endDate: "2027-03-08", label: "7 feb – 8 mar" },
      { name: "Nisán", startDate: "2027-03-09", endDate: "2027-04-07", label: "9 mar – 7 abr" },
      { name: "Iyar", startDate: "2027-04-08", endDate: "2027-05-06", label: "8 abr – 6 may" },
      { name: "Siván", startDate: "2027-05-07", endDate: "2027-06-04", label: "7 may – 4 jun" },
      { name: "Tamuz", startDate: "2027-06-05", endDate: "2027-07-04", label: "5 jun – 4 jul" },
      { name: "Av", startDate: "2027-07-05", endDate: "2027-08-02", label: "5 jul – 2 ago" },
      { name: "Elul", startDate: "2027-08-03", endDate: "2027-10-01", label: "3 ago – 1 oct" },
    ],
  },
};

/**
 * Get the current Hebrew year based on today's date
 */
export function getCurrentHebrewYear(): number {
  const today = new Date().toISOString().split("T")[0];
  for (const [, data] of Object.entries(HEBREW_YEARS).sort(([a], [b]) => Number(b) - Number(a))) {
    if (today >= data.startDate && today <= data.endDate) {
      return data.hebrewYear;
    }
  }
  // Fallback: estimate based on Gregorian year
  const gYear = new Date().getFullYear();
  const month = new Date().getMonth();
  return gYear + 3760 + (month >= 8 ? 1 : 0);
}

/**
 * Get Hebrew year data
 */
export function getHebrewYearData(hebrewYear: number): HebrewYearData | null {
  return HEBREW_YEARS[hebrewYear] || null;
}

/**
 * Get all available Hebrew years
 */
export function getAvailableHebrewYears(): number[] {
  return Object.keys(HEBREW_YEARS).map(Number).sort((a, b) => b - a);
}
