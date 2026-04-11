import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateExport } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats whole numbers with two decimals", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1500.5)).toBe("$1,500.50");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-50)).toBe("$-50.00");
  });
});

describe("formatDate", () => {
  it("converts ISO date to DD/MM/YYYY", () => {
    expect(formatDate("2026-04-09")).toBe("09/04/2026");
  });

  it("returns dash for empty string", () => {
    expect(formatDate("")).toBe("-");
  });
});

describe("formatDateExport", () => {
  it("formats date with Spanish month abbreviation", () => {
    expect(formatDateExport("2026-01-15")).toBe("15-ene-2026");
  });

  it("returns dash for empty string", () => {
    expect(formatDateExport("")).toBe("-");
  });
});
