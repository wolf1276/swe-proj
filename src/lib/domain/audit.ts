import { prisma } from "@/lib/prisma";

/**
 * Audit event recording (security.md / FR-8).
 * Every admin moderation action writes an immutable AuditEvent row in the
 * same transaction as the state change it explains.
 */

export interface AuditContext {
  actorId: string;
  action: string;
  targetType: "report" | "listing" | "user";
  targetId: string;
  reason?: string;
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function recordAudit(tx: PrismaTx | typeof prisma, context: AuditContext): Promise<void> {
  await tx.auditEvent.create({
    data: {
      actorId: context.actorId,
      action: context.action,
      targetType: context.targetType,
      targetId: context.targetId,
      reason: context.reason,
    },
  });
}
