import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// The auth provider creates/verifies cryptographic proofs. This database
// receipt only enforces atomic single-use, including simultaneous clicks.
const proofId = (token: string) => `email-proof:${createHash("sha256").update(token).digest("hex")}`;
export async function issueVerificationProof(token: string, userId: string) {
  const id = proofId(token);
  await prisma.verification.upsert({
    where: { id },
    update: {},
    create: { id, identifier: id, value: userId, expiresAt: new Date(Date.now() + 3600000) },
  });
}
export async function consumeVerificationProof(token: string): Promise<boolean> {
  if (!token || token.length > 4096) return false;
  const result = await prisma.verification.deleteMany({ where: { id: proofId(token), expiresAt: { gt: new Date() } } });
  return result.count === 1;
}
