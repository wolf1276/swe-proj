import { describe, expect, it } from "vitest";
import {
  UUID,
  USER_ID,
  contactInputSchema,
  listingInputSchema,
  listingQuerySchema,
  listingUpdateSchema,
  parseListingQuery,
  reportInputSchema,
  reportResolveSchema,
} from "@/lib/validation";

const validListing = {
  title: "Study lamp",
  description: "Works well",
  categoryId: "44db1133-023e-4609-ad37-482b234cbdb8",
  offerType: "sale",
  priceMinor: 15000,
  currency: "INR",
  condition: "good",
};

describe("listing input validation (FR-4, FR-5)", () => {
  it("accepts a valid sale with a price", () => {
    const parsed = listingInputSchema.parse(validListing);
    expect(parsed.priceMinor).toBe(15000);
  });

  it("accepts a donation without a price", () => {
    const parsed = listingInputSchema.parse({ ...validListing, offerType: "donation", priceMinor: undefined });
    expect(parsed.priceMinor).toBeUndefined();
  });

  it("rejects a donation with a non-zero price", () => {
    const result = listingInputSchema.safeParse({ ...validListing, offerType: "donation", priceMinor: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects a sale without a price", () => {
    const result = listingInputSchema.safeParse({ ...validListing, priceMinor: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects negative, fractional and overflowing prices", () => {
    for (const priceMinor of [-1, 10.5, 100_000_001, Number.MAX_SAFE_INTEGER]) {
      expect(listingInputSchema.safeParse({ ...validListing, priceMinor }).success).toBe(false);
    }
  });

  it("rejects privileged fields submitted by clients (ownership/moderation never client-writable)", () => {
    const result = listingInputSchema.safeParse({
      ...validListing,
      ownerId: "attacker-user-id",
      moderationState: "visible",
    });
    expect(result.success).toBe(false);
  });

  it("enforces title length bounds", () => {
    expect(listingInputSchema.safeParse({ ...validListing, title: "ab" }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...validListing, title: "x".repeat(121) }).success).toBe(false);
  });

  it("rejects unknown offer types, conditions and currencies", () => {
    expect(listingInputSchema.safeParse({ ...validListing, offerType: "rental" }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...validListing, condition: "broken" }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...validListing, currency: "USD" }).success).toBe(false);
  });
});

describe("listing update validation (optimistic concurrency)", () => {
  it("requires an integer version", () => {
    const base = { ...validListing, version: 1 };
    expect(listingUpdateSchema.safeParse(base).success).toBe(true);
    expect(listingUpdateSchema.safeParse({ ...base, version: 0 }).success).toBe(false);
    expect(listingUpdateSchema.safeParse({ ...base, version: 1.5 }).success).toBe(false);
    expect(listingUpdateSchema.safeParse({ ...base, version: undefined }).success).toBe(false);
  });

  it("accepts only known availability values", () => {
    const base = { ...validListing, version: 1 };
    expect(listingUpdateSchema.safeParse({ ...base, availability: "available" }).success).toBe(true);
    expect(listingUpdateSchema.safeParse({ ...base, availability: "sold" }).success).toBe(false);
  });
});

describe("search query validation (FR-5 filter semantics)", () => {
  it("rejects min greater than max price", () => {
    const result = listingQuerySchema.safeParse({ minPriceMinor: 500, maxPriceMinor: 100 });
    expect(result.success).toBe(false);
  });

  it("coerces numeric query strings", () => {
    const parsed = listingQuerySchema.parse({ minPriceMinor: "100", page: "2" });
    expect(parsed.minPriceMinor).toBe(100);
    expect(parsed.page).toBe(2);
  });

  it("rejects out-of-range price filters and pages", () => {
    expect(listingQuerySchema.safeParse({ minPriceMinor: -1 }).success).toBe(false);
    expect(listingQuerySchema.safeParse({ maxPriceMinor: 100_000_001 }).success).toBe(false);
    expect(listingQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it("parses a URLSearchParams bag, dropping empty values", () => {
    const params = new URLSearchParams("q=lamp&offerType=&page=1");
    expect(parseListingQuery(params)).toEqual({ q: "lamp", page: 1 });
  });
});

describe("contact and report validation (FR-6, FR-7)", () => {
  it("accepts an optional message and idempotency key", () => {
    expect(contactInputSchema.parse({})).toEqual({});
    expect(contactInputSchema.parse({ message: "hi", idempotencyKey: "abc" })).toEqual({
      message: "hi",
      idempotencyKey: "abc",
    });
  });

  it("bounds contact message length", () => {
    expect(contactInputSchema.safeParse({ message: "x".repeat(1001) }).success).toBe(false);
  });

  it("accepts only known report reasons", () => {
    expect(reportInputSchema.safeParse({ reason: "spam" }).success).toBe(true);
    expect(reportInputSchema.safeParse({ reason: "defamation" }).success).toBe(false);
  });

  it("requires a substantive review reason for moderation decisions", () => {
    expect(reportResolveSchema.safeParse({ action: "dismiss", reviewReason: "ok" }).success).toBe(false);
    expect(
      reportResolveSchema.safeParse({ action: "remove", reviewReason: "Confirmed prohibited item" }).success
    ).toBe(true);
    expect(reportResolveSchema.safeParse({ action: "delete", reviewReason: "Confirmed" }).success).toBe(false);
  });

  it("rejects client-submitted moderation state on report input", () => {
    expect(reportInputSchema.safeParse({ reason: "spam", state: "actioned" }).success).toBe(false);
  });
});

describe("identifier validation", () => {
  it("accepts generated UUIDs and rejects malformed ones", () => {
    expect(UUID.safeParse("44db1133-023e-4609-ad37-482b234cbdb8").success).toBe(true);
    expect(UUID.safeParse("not-a-uuid").success).toBe(false);
  });

  it("accepts auth-integration user ids (opaque, not UUIDs)", () => {
    expect(USER_ID.safeParse("o65m0kgoiM7Xn86A02OhQO8g3zpT0d6K").success).toBe(true);
    expect(USER_ID.safeParse("").success).toBe(false);
  });
});
