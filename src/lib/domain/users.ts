import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { serializeAdminUser } from "@/lib/serialize";
import { recordAudit } from "@/lib/domain/audit";

/**
 * Admin user management (FR-8).
 *
 * Suspension/reactivation atomically changes the provider-compatible ban
 * fields, revokes sessions and records the administrative audit event. Protections enforced server-side:
 * - the acting admin cannot suspend themselves;
 * - the last remaining active admin cannot be suspended;
 * - every action is recorded in the audit log with a reason.
 */

export async function listUsers(query: { q?: string; page?: number } = {}) {
  const page = query.page ?? 1;
  const pageSize = 50;
  const where = query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { email: { contains: query.q, mode: "insensitive" as const } }] } : {};
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize, include: { _count: { select: { listings: true } } } }),
  ]);
  return { items: rows.map(serializeAdminUser), total, page, pageSize };
}

export async function setUserStatus(
  actor: { userId: string },
  targetId: string,
  input: { action: "suspend" | "reactivate"; reason?: string },
) {
  return prisma.$transaction(async (tx) => {
    // Serialize admin changes so two admins cannot concurrently remove the
    // last active admin. Status, session revocation, and audit commit together.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7364521)`;
    const currentActor = await tx.user.findUnique({ where: { id: actor.userId } });
    if (!currentActor || currentActor.banned || currentActor.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "Active administrator access required");
    }
    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");
    if (input.action === "suspend") {
      if (actor.userId === targetId) throw new ApiError(422, "CANNOT_SUSPEND_SELF", "Administrators cannot suspend their own account");
      if (target.role === "admin" && !target.banned && await tx.user.count({ where: { role: "admin", OR: [{ banned: false }, { banned: null }] } }) <= 1) {
        throw new ApiError(422, "LAST_ADMIN", "The last active administrator cannot be suspended");
      }
    }
    const updated = await tx.user.update({
      where: { id: targetId },
      data: { banned: input.action === "suspend", banReason: input.action === "suspend" ? input.reason ?? "Suspended by administrator" : null, banExpires: null },
      include: { _count: { select: { listings: true } } },
    });
    if (input.action === "suspend") await tx.session.deleteMany({ where: { userId: targetId } });
    await recordAudit(tx, { actorId: actor.userId, action: `user.${input.action}`, targetType: "user", targetId, reason: input.reason ?? "Administrator reactivation" });
    return serializeAdminUser(updated);
  });
}
