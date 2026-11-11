/**
 * Money handling.
 *
 * CampusTrade stores prices as integer minor units (paise). All amounts are
 * submitted and displayed as whole rupees; fractional rupees are rejected.
 * Donations always have a zero price. These helpers define the single
 * conversion point used by validation, persistence, and serialization.
 */

export const MAX_PRICE_RUPEES = 1_000_000;

/** Converts whole rupees to integer minor units (paise). */
export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Converts integer minor units (paise) back to whole rupees. */
export function minorToRupees(minor: number): number {
  return minor / 100;
}

/** Validates an in-range whole-rupee price; returns minor units. */
export function priceToMinor(rupees: number | undefined): number {
  if (rupees === undefined) {
    return 0;
  }
  if (!Number.isInteger(rupees) || rupees < 0 || rupees > MAX_PRICE_RUPEES) {
    throw new Error(`Price must be a whole number of rupees between 0 and ${MAX_PRICE_RUPEES}`);
  }
  return rupeesToMinor(rupees);
}

/** Formats minor units as a rupee string for display (e.g. "Rs 1,250"). */
export function formatRupees(minor: number): string {
  const rupees = minorToRupees(minor);
  const formatted = rupees.toLocaleString("en-IN");
  return `Rs ${formatted}`;
}
