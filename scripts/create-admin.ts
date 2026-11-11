/**
 * Operator-only admin bootstrap (api.md: admin provisioning is an
 * operator-only path, never public registration).
 *
 * Creates (or promotes) an administrator account from ADMIN_EMAIL /
 * ADMIN_PASSWORD environment variables. Refuses to run in production
 * without explicit credentials and never prints the password.
 *
 * Usage: pnpm admin:create   (tsx scripts/create-admin.ts)
 */
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];
  const name = process.env["ADMIN_NAME"] ?? "Campus Administrator";
  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (and optionally ADMIN_NAME) to bootstrap an administrator"
    );
  }
  const credentials = z.object({ email: z.email().max(255), password: z.string().min(8).max(128), name: z.string().trim().min(1).max(80) }).parse({ email: email.trim().toLowerCase(), password, name });
  const normalizedEmail = credentials.email;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role: "admin", emailVerified: true },
    create: {
      id: randomUUID(),
      email: normalizedEmail,
      name,
      emailVerified: true,
      // Operator credentials enable admin login, not student mailbox proof.
      emailVerifiedAt: null,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const existingAccount = await prisma.account.findFirst({ where: { userId: user.id } });
  if (!existingAccount) {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  }

  console.log(`Administrator ready: ${normalizedEmail} (id ${user.id})`);
}

main()
  .catch((error) => {
    console.error("Admin bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
