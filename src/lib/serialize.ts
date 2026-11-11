import type {
  Category,
  ContactRequest,
  Listing,
  ListingReport,
  User,
} from "@/generated/prisma/client";
import { minorToRupees } from "@/lib/money";

/**
 * DTO serializers. Responses deliberately exclude private account fields
 * (emails, moderation metadata of other users, ban reasons) - see
 * security.md and api.md ("without private seller contact fields").
 * Nulls from the persistence layer (donation price, optional message,
 * unassigned admin role) are normalized here, at the boundary.
 */

export interface ListingSummary {
  id: string;
  title: string;
  offerType: "sale" | "donation";
  priceRupees: number;
  currency: "INR";
  condition: "new" | "good" | "fair";
  availability: "available" | "unavailable";
  category: { id: string; name: string };
  owner: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ListingDetail extends ListingSummary {
  description: string;
  version: number;
}

export interface MyListing extends ListingSummary {
  description: string;
  version: number;
  moderationState: "visible" | "removed";
  reportCount: number;
}

export interface ContactSummary {
  id: string;
  listing: { id: string; title: string };
  counterpart: { id: string; name: string; email: string };
  direction: "sent" | "received";
  message: string;
  notificationStatus: "pending" | "sent" | "failed";
  createdAt: string;
}

export interface ReportSummary {
  id: string;
  listing: { id: string; title: string; moderationState: "visible" | "removed"; description: string; offerType: string; priceMinor: number | null; condition: string; availability: string };
  reporter: { id: string; name: string };
  reason: string;
  details: string | null;
  state: "pending" | "dismissed" | "actioned";
  reviewedBy: { id: string; name: string } | null;
  reviewReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  suspended: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  listingCount: number;
}

type ListingWithRelations = Listing & {
  category: Category;
  owner: Pick<User, "id" | "name">;
};

function baseListing(listing: ListingWithRelations): ListingSummary {
  return {
    id: listing.id,
    title: listing.title,
    offerType: listing.offerType,
    priceRupees: listing.priceMinor === null ? 0 : minorToRupees(listing.priceMinor),
    currency: "INR",
    condition: listing.condition,
    availability: listing.availability,
    category: { id: listing.category.id, name: listing.category.name },
    owner: { id: listing.owner.id, name: listing.owner.name },
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

export function serializeListing(listing: ListingWithRelations): ListingDetail {
  return {
    ...baseListing(listing),
    description: listing.description,
    version: listing.version,
  };
}

export function serializeMyListing(
  listing: ListingWithRelations & { _count?: { reports?: number } }
): MyListing {
  return {
    ...baseListing(listing),
    description: listing.description,
    version: listing.version,
    moderationState: listing.moderationState,
    reportCount: listing._count?.reports ?? 0,
  };
}

export function serializeContact(
  contact: ContactRequest & {
    listing: Pick<Listing, "id" | "title"> & {
      owner: Pick<User, "id" | "name" | "email">;
    };
    requester: Pick<User, "id" | "name" | "email">;
  },
  viewerId: string
): ContactSummary {
  const direction = contact.requesterId === viewerId ? "sent" : "received";
  const counterpart = direction === "sent" ? contact.listing.owner : contact.requester;
  return {
    id: contact.id,
    listing: { id: contact.listing.id, title: contact.listing.title },
    counterpart,
    direction,
    message: contact.message ?? "",
    notificationStatus: contact.notificationStatus,
    createdAt: contact.createdAt.toISOString(),
  };
}

export function serializeReport(
  report: ListingReport & {
    listing: Pick<Listing, "id" | "title" | "moderationState" | "description" | "offerType" | "priceMinor" | "condition" | "availability">;
    reporter: Pick<User, "id" | "name">;
    reviewer: Pick<User, "id" | "name"> | null;
  }
): ReportSummary {
  return {
    id: report.id,
    listing: {
      id: report.listing.id,
      title: report.listing.title,
      moderationState: report.listing.moderationState,
      description: report.listing.description,
      offerType: report.listing.offerType,
      priceMinor: report.listing.priceMinor,
      condition: report.listing.condition,
      availability: report.listing.availability,
    },
    reporter: { id: report.reporter.id, name: report.reporter.name },
    reason: report.reason,
    details: report.details,
    state: report.state,
    reviewedBy: report.reviewer ? { id: report.reviewer.id, name: report.reviewer.name } : null,
    reviewReason: report.reviewReason,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
  };
}

export function serializeAdminUser(
  user: User & { _count?: { listings?: number } }
): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role === "admin" ? "admin" : "user",
    suspended: user.banned === true,
    banReason: user.banReason,
    banExpires: user.banExpires?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    listingCount: user._count?.listings ?? 0,
  };
}
