import { z } from "zod";

/**
 * Validation schemas for request bodies and query strings (api.md).
 *
 * Prices are integer minor units (paise) on the wire; the browser UI
 * converts whole rupees before submitting. Donations persist a null price
 * (data-model.md). Owner/moderation/privileged fields are rejected (strict
 * objects) - identity always comes from the server-side session, never from
 * the request body. Image storage is deferred (architecture.md), so image
 * fields are not accepted.
 */

export const OFFER_TYPES = ["sale", "donation"] as const;
export const CONDITIONS = ["new", "good", "fair"] as const;
export const AVAILABILITY = ["available", "unavailable"] as const;
export const REPORT_REASONS = [
  "misleading",
  "inappropriate",
  "prohibited_item",
  "spam",
  "other",
] as const;
export const MAX_PRICE_MINOR = 100_000_000; // 1,000,000 rupees in paise

const priceMinorSchema = z
  .number()
  .int("Price must be a whole number of minor units")
  .min(0, "Price cannot be negative")
  .max(MAX_PRICE_MINOR, "Price exceeds the maximum allowed");

export const listingInputSchema = z
  .strictObject({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title must be at most 120 characters"),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be at most 2000 characters")
      .default(""),
    categoryId: z.string().min(1).max(64),
    offerType: z.enum(OFFER_TYPES),
    priceMinor: priceMinorSchema.optional(),
    currency: z.literal("INR").default("INR"),
    condition: z.enum(CONDITIONS),
  })
  .superRefine((value, ctx) => {
    if (value.offerType === "sale") {
      if (value.priceMinor === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["priceMinor"],
          message: "Price is required for items offered for sale",
        });
      }
    } else if (value.priceMinor !== undefined && value.priceMinor !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["priceMinor"],
        message: "Donations cannot have a price",
      });
    }
  });

export const listingUpdateSchema = z
  .strictObject({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title must be at most 120 characters"),
    description: z.string().trim().max(2000, "Description must be at most 2000 characters").default(""),
    categoryId: z.string().min(1).max(64),
    offerType: z.enum(OFFER_TYPES),
    priceMinor: priceMinorSchema.optional(),
    currency: z.literal("INR").default("INR"),
    condition: z.enum(CONDITIONS),
    availability: z.enum(AVAILABILITY).optional(),
    version: z.number().int().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.offerType === "sale") {
      if (value.priceMinor === undefined) {
        ctx.addIssue({ code: "custom", path: ["priceMinor"], message: "Price is required for items offered for sale" });
      }
    } else if (value.priceMinor !== undefined && value.priceMinor !== 0) {
      ctx.addIssue({ code: "custom", path: ["priceMinor"], message: "Donations cannot have a price" });
    }
  });

export const listingQuerySchema = z
  .strictObject({
    q: z.string().trim().max(120).optional(),
    categoryId: z.string().min(1).max(64).optional(),
    offerType: z.enum(OFFER_TYPES).optional(),
    minPriceMinor: z.coerce.number().int().min(0).max(MAX_PRICE_MINOR).optional(),
    maxPriceMinor: z.coerce.number().int().min(0).max(MAX_PRICE_MINOR).optional(),
    condition: z.enum(CONDITIONS).optional(),
    availability: z.enum(["available", "unavailable", "all"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.minPriceMinor !== undefined &&
      value.maxPriceMinor !== undefined &&
      value.minPriceMinor > value.maxPriceMinor
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxPriceMinor"],
        message: "Minimum price cannot exceed maximum price",
      });
    }
  });

export const contactInputSchema = z.strictObject({
  message: z.string().trim().max(1000, "Message must be at most 1000 characters").optional(),
  idempotencyKey: z.string().min(1).max(64).optional(),
});

export const reportInputSchema = z.strictObject({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000, "Details must be at most 1000 characters").optional(),
});

export const reportResolveSchema = z.strictObject({
  action: z.enum(["dismiss", "remove"]),
  reviewReason: z.string().trim().min(3, "A review reason is required").max(1000, "Review reason must be at most 1000 characters"),
});

export const adminUserStatusSchema = z.strictObject({
  action: z.enum(["suspend", "reactivate"]),
  reason: z.string().trim().max(1000).optional(),
});

export type ListingInput = z.infer<typeof listingInputSchema>;
export type ListingUpdate = z.infer<typeof listingUpdateSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const REPORT_FILTER_STATES = ["pending", "dismissed", "actioned"] as const;

/** Opaque resource identifiers we generate (route params). */
export const UUID = z.uuid("Expected a UUID");

/**
 * Better Auth user identifiers (auth-integration generated, not UUIDs).
 * Only used for path scoping; ownership/identity still comes from session.
 */
export const USER_ID = z.string().min(1).max(128);

/** Parses a URL search params bag into a validated ListingQuery. */
export function parseListingQuery(params: URLSearchParams): ListingQuery {
  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") {
      raw[key] = value;
    }
  }
  return listingQuerySchema.parse(raw);
}
