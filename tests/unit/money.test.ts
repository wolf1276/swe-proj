import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_RUPEES,
  formatRupees,
  minorToRupees,
  priceToMinor,
  rupeesToMinor,
} from "@/lib/money";

describe("money conversions (FR-5, api.md integer minor units)", () => {
  it("converts whole rupees to paise and back", () => {
    expect(rupeesToMinor(1250)).toBe(125000);
    expect(minorToRupees(125000)).toBe(1250);
    expect(rupeesToMinor(0)).toBe(0);
  });

  it("accepts zero and the maximum price", () => {
    expect(priceToMinor(0)).toBe(0);
    expect(priceToMinor(MAX_PRICE_RUPEES)).toBe(100_000_000);
  });

  it("rejects negative prices", () => {
    expect(() => priceToMinor(-1)).toThrow(/between 0 and/);
  });

  it("rejects prices above the maximum (overflow guard)", () => {
    expect(() => priceToMinor(MAX_PRICE_RUPEES + 1)).toThrow(/between 0 and/);
    expect(() => priceToMinor(Number.MAX_SAFE_INTEGER)).toThrow(/between 0 and/);
  });

  it("rejects fractional rupees", () => {
    expect(() => priceToMinor(10.5)).toThrow(/whole number/);
  });

  it("treats an omitted price as zero (donations)", () => {
    expect(priceToMinor(undefined)).toBe(0);
  });

  it("formats minor units for display", () => {
    expect(formatRupees(125000)).toBe("Rs 1,250");
    expect(formatRupees(0)).toBe("Rs 0");
  });
});
