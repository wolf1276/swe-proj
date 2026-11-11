import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { serializeReport } from "@/lib/serialize";
import { recordAudit } from "@/lib/domain/audit";
import type { ReportReason as ReportReasonEnum } from "@/generated/prisma/client";

/**
 * Reporting and moderation domain logic (FR-7, FR-8).
 *
 * Rules:
 * - Any verified active student can report a visible listing (not their own);
 * - a student may have at most one pending report per listing; duplicate
 *   submissions return the existing pending state predictably (api.md);
 * - admin resolution (dismiss|remove) runs in a single transaction:
 *   report state update + listing visibility change + audit event;
 * - resolving a non-pending report is a 409 (stale resolution).
 */

export async function reportListing(
  actor: { userId: string },
  listingId: string,
  input: { reason: ReportReasonEnum; details?: string }
) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    select: { id: true, ownerId: true, moderationState: true, deletedAt: true },
  });
  if (!listing || listing.moderationState !== "visible" || listing.deletedAt !== null) {
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  if (listing.ownerId === actor.userId) {
    throw new ApiError(422, "OWN_LISTING", "You cannot report your own listing");
  }
  return prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
  const current = await tx.listing.findUnique({ where: { id: listingId } });
  if (!current || current.deletedAt || current.moderationState !== "visible") throw new ApiError(404, "NOT_FOUND", "Listing not found");
  const duplicate = await tx.listingReport.findFirst({
    where: { listingId, reporterId: actor.userId, state: "pending" },
    select: { id: true, state: true },
  });
  if (duplicate) {
    throw new ApiError(
      409,
      "DUPLICATE_PENDING_REPORT",
      "You already have a pending report for this listing"
    );
  }
  const report = await tx.listingReport.create({
    data: {
      listingId: listing.id,
      reporterId: actor.userId,
      reason: input.reason,
      details: input.details?.trim() ? input.details : null,
    },
  });
  return { reportId: report.id, state: report.state };
  });
}

export async function listReports(filter?: { state?: "pending" | "dismissed" | "actioned"; page?: number }) {
  const page = filter?.page ?? 1;
  const pageSize = 50;
  const where = filter?.state ? { state: filter.state } : undefined;
  const rows = await prisma.listingReport.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize,
    skip: (page - 1) * pageSize,
    include: {
      listing: { select: { id: true, title: true, moderationState: true, description: true, offerType: true, priceMinor: true, condition: true, availability: true } },
      reporter: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
  return { items: rows.map(serializeReport), page, pageSize, total: await prisma.listingReport.count({ where }) };
}

export async function resolveReport(
  admin: { userId: string },
  reportId: string,
  input: { action: "dismiss" | "remove"; reviewReason: string }
) {
  const reportId2 = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ListingReport" WHERE id = ${reportId} FOR UPDATE`;
    const report = await tx.listingReport.findUnique({
      where: { id: reportId },
      include: { listing: { select: { id: true, moderationState: true, deletedAt: true } } },
    });
    if (!report) {
      throw new ApiError(404, "NOT_FOUND", "Report not found");
    }
    if (report.state !== "pending") {
      throw new ApiError(409, "REPORT_ALREADY_RESOLVED", "This report has already been resolved");
    }
    if (input.action === "remove" && report.listing.moderationState !== "removed") {
      // Atomic visibility change with the resolution (api.md).
      await tx.listing.update({
        where: { id: report.listingId },
        data: { moderationState: "removed", availability: "unavailable", version: { increment: 1 } },
      });
    }
    await tx.listingReport.update({
      where: { id: report.id },
      data: {
        state: input.action === "remove" ? "actioned" : "dismissed",
        reviewerId: admin.userId,
        reviewReason: input.reviewReason,
        resolvedAt: new Date(),
      },
    });
    await recordAudit(tx, {
      actorId: admin.userId,
      action: `report.${input.action}`,
      targetType: "report",
      targetId: report.id,
      reason: input.reviewReason,
    });
    return report.id;
  });
  const resolved = await prisma.listingReport.findUnique({
    where: { id: reportId2 },
    include: {
      listing: { select: { id: true, title: true, moderationState: true, description: true, offerType: true, priceMinor: true, condition: true, availability: true } },
      reporter: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
  if (!resolved) {
    throw new ApiError(404, "NOT_FOUND", "Report not found");
  }
  return serializeReport(resolved);
}
