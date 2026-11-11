import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { sendMail } from "@/lib/mail";
import { serializeContact } from "@/lib/serialize";

/**
 * Contact request domain logic (FR-6).
 *
 * Contacts are interest/notification records - never transactions.
 * Rules:
 * - Only verified active students who are not the listing owner may
 *   express interest, and only for visible + available + non-deleted
 *   listings;
 * - submissions are idempotent per (listing, requester): a repeat returns
 *   the existing durable record (safe retry, api.md);
 * - notification delivery status is persisted (pending/sent/failed) and
 *   the response reports that status, not any transactional success.
 */

const CONTACT_INCLUDE = {
  listing: { select: { id: true, title: true, owner: { select: { id: true, name: true, email: true } } } },
  requester: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ContactRequestInclude;

export async function expressInterest(
  actor: { userId: string; name: string; email: string },
  listingId: string,
  input: { message?: string; idempotencyKey?: string }
) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
  if (!listing || listing.moderationState !== "visible" || listing.deletedAt !== null) {
    throw new ApiError(404, "NOT_FOUND", "Listing not found");
  }
  if (listing.availability !== "available") {
    throw new ApiError(409, "LISTING_UNAVAILABLE", "This listing is no longer available");
  }
  if (listing.ownerId === actor.userId) {
    throw new ApiError(403, "OWN_LISTING", "You cannot express interest in your own listing");
  }
  try {
    const contact = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
      const current = await tx.listing.findUnique({ where: { id: listingId } });
      if (!current || current.deletedAt || current.moderationState !== "visible") throw new ApiError(404, "NOT_FOUND", "Listing not found");
      if (current.availability !== "available") throw new ApiError(409, "LISTING_UNAVAILABLE", "This listing is no longer available");
      return tx.contactRequest.create({
      data: {
        listingId: listing.id,
        requesterId: actor.userId,
        ownerId: listing.ownerId,
        message: input.message?.trim() ? input.message : null,
        idempotencyKey: input.idempotencyKey,
        notificationStatus: "pending",
      },
      include: CONTACT_INCLUDE,
    });
    });

    // Best-effort owner notification; the durable record survives failures.
    let notificationStatus: "pending" | "sent" | "failed" = "failed";
    try {
      await sendMail({
        to: listing.owner.email,
        subject: `Someone is interested in "${listing.title}"`,
        text: [
          `${actor.name} expressed interest in your listing "${listing.title}".`,
          "",
          "Message:",
          input.message ?? "(no message)",
          "",
          "Sign in to CampusTrade to see the request. Do not reply to this email.",
        ].join("\n"),
      });
      notificationStatus = "sent";
    } catch {
      notificationStatus = "failed";
    }
    const updated = await prisma.contactRequest.update({
      where: { id: contact.id },
      data: { notificationStatus },
      include: CONTACT_INCLUDE,
    });
    return { contact: serializeContact(updated, actor.userId), created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Idempotent retry: return the existing durable contact.
      const existing = await prisma.contactRequest.findUnique({
        where: { listingId_requesterId: { listingId: listing.id, requesterId: actor.userId } },
        include: CONTACT_INCLUDE,
      });
      if (existing) {
        return { contact: serializeContact(existing, actor.userId), created: false };
      }
    }
    throw error;
  }
}

/** Lists the caller's sent and received contact records (participant scope). */
export async function listMyContacts(actor: { userId: string }) {
  const rows = await prisma.contactRequest.findMany({
    where: {
      OR: [{ requesterId: actor.userId }, { ownerId: actor.userId }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    include: CONTACT_INCLUDE,
  });
  return rows.map((row) => serializeContact(row, actor.userId));
}

/** Reads a single contact record if the caller participates in it. */
export async function getContactForActor(actor: { userId: string }, contactId: string) {
  const contact = await prisma.contactRequest.findFirst({
    where: {
      id: contactId,
      OR: [{ requesterId: actor.userId }, { ownerId: actor.userId }],
    },
    include: CONTACT_INCLUDE,
  });
  if (!contact) {
    throw new ApiError(404, "NOT_FOUND", "Contact request not found");
  }
  return serializeContact(contact, actor.userId);
}

/** Participant-requested retry; a conditional claim prevents duplicate sends. */
export async function retryContactNotification(actor: { userId: string }, contactId: string) {
  const contact = await prisma.contactRequest.findFirst({
    where: { id: contactId, OR: [{ requesterId: actor.userId }, { ownerId: actor.userId }] },
    include: { ...CONTACT_INCLUDE, listing: { select: { id: true, title: true, owner: { select: { id: true, name: true, email: true } } } } },
  });
  if (!contact) throw new ApiError(404, "NOT_FOUND", "Contact request not found");
  const claim = await prisma.contactRequest.updateMany({ where: { id: contactId, notificationStatus: "failed" }, data: { notificationStatus: "pending" } });
  if (claim.count) {
    let status: "sent" | "failed" = "failed";
    try {
      await sendMail({ to: contact.listing.owner.email, subject: `Someone is interested in "${contact.listing.title}"`, text: `${contact.requester.name} expressed interest in your listing.\n\n${contact.message ?? "(no message)"}\n\nSign in to CampusTrade to see the request.` });
      status = "sent";
    } catch { /* The durable contact and participant emails remain available. */ }
    await prisma.contactRequest.update({ where: { id: contactId }, data: { notificationStatus: status } });
  }
  return getContactForActor(actor, contactId);
}
