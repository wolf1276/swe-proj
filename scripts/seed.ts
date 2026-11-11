/**
 * Local development seed (demo.md identities).
 *
 * Creates the synthetic demo accounts and a small set of listings using
 * the development mail adapter. All accounts use the local seed password
 * from DEV_SEED_PASSWORD. No real student data is involved.
 *
 * Usage: pnpm seed   (tsx scripts/seed.ts)
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";
import { env } from "@/lib/env";

const CATEGORY_SEED: { slug: string; name: string; sortOrder: number }[] = [
  { slug: "textbooks", name: "Textbooks", sortOrder: 1 },
  { slug: "lab-equipment", name: "Lab equipment", sortOrder: 2 },
  { slug: "stationery", name: "Stationery", sortOrder: 3 },
  { slug: "furniture", name: "Furniture", sortOrder: 4 },
  { slug: "hostel-items", name: "Hostel items", sortOrder: 5 },
  { slug: "other-academic-items", name: "Other academic items", sortOrder: 6 },
];

async function upsertCategory(slug: string, name: string, sortOrder: number) {
  return prisma.category.upsert({ where: { slug }, update: { name, sortOrder }, create: { slug, name, sortOrder } });
}

async function upsertUser(input: {
  email: string;
  name: string;
  role: "user" | "admin";
  emailVerified: boolean;
  banned?: boolean;
  banReason?: string;
}) {
  const passwordHash = await hashPassword(env.devSeedPassword ?? "local-seed-pass-1234");
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      emailVerified: input.emailVerified,
      emailVerifiedAt: input.emailVerified ? new Date() : null,
      banned: input.banned ?? false,
      banReason: input.banned ? (input.banReason ?? null) : null,
    },
    create: {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      emailVerified: input.emailVerified,
      emailVerifiedAt: input.emailVerified ? new Date() : null,
      role: input.role,
      banned: input.banned ?? false,
      banReason: input.banned ? (input.banReason ?? null) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }).then(async (user) => {
    // Direct account row keeps the seed idempotent (no password email flows).
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
    return user;
  });
}

async function main() {
  if (env.isProduction) {
    throw new Error("The seed script must not run in production");
  }
  console.log("Seeding categories...");
  const categories: Record<string, string> = {};
  for (const category of CATEGORY_SEED) {
    const saved = await upsertCategory(category.slug, category.name, category.sortOrder);
    categories[category.slug] = saved.id;
  }

  console.log("Seeding synthetic demo accounts (local development only)...");
  // demo.md identities: student A (owner), student B (interested), unverified
  // eligible account, ineligible-domain account, administrator, suspended account.
  const studentA = await upsertUser({
    email: "a.student@campus.example",
    name: "Student A",
    role: "user",
    emailVerified: true,
  });
  const studentB = await upsertUser({
    email: "b.student@campus.example",
    name: "Student B",
    role: "user",
    emailVerified: true,
  });
  await upsertUser({
    email: "unverified@campus.example",
    name: "Unverified Student",
    role: "user",
    emailVerified: false,
  });
  await upsertUser({
    email: "outside@gmail.example",
    name: "Outside Account",
    role: "user",
    emailVerified: true,
  });
  const admin = await upsertUser({
    email: "admin@campus.example",
    name: "Campus Administrator",
    role: "admin",
    emailVerified: true,
  });
  await upsertUser({ email: "operator@staff.example", name: "Operator Administrator", role: "admin", emailVerified: true });
  const suspended = await upsertUser({
    email: "suspended@campus.example",
    name: "Suspended Student",
    role: "user",
    emailVerified: true,
    banned: true,
    banReason: "Local development suspension demonstration",
  });

  console.log("Seeding demo listings...");
  const demoListings: {
    ownerId: string;
    title: string;
    description: string;
    categorySlug: string;
    offerType: "sale" | "donation";
    priceMinor: number | null;
    condition: "new" | "good" | "fair";
    availability: "available" | "unavailable";
  }[] = [
    {
      ownerId: studentA.id,
      title: "Engineering Mathematics textbook (7th edition)",
      description: "Barely used, all pages intact. Selling because I finished the course.",
      categorySlug: "textbooks",
      offerType: "sale",
      priceMinor: 45000,
      condition: "good",
      availability: "available",
    },
    {
      ownerId: studentA.id,
      title: "Lab coat and safety goggles",
      description: "Donation: clean lab coat (size M) and unused safety goggles.",
      categorySlug: "lab-equipment",
      offerType: "donation",
      priceMinor: null,
      condition: "good",
      availability: "available",
    },
    {
      ownerId: studentB.id,
      title: "Study desk lamp",
      description: "LED desk lamp, works perfectly. Pickup from hostel block C.",
      categorySlug: "hostel-items",
      offerType: "sale",
      priceMinor: 30000,
      condition: "fair",
      availability: "available",
    },
    {
      ownerId: studentB.id,
      title: "Wooden study chair",
      description: "Sturdy chair, moving out of hostel so no longer needed.",
      categorySlug: "furniture",
      offerType: "sale",
      priceMinor: 120000,
      condition: "fair",
      availability: "unavailable",
    },
    {
      ownerId: suspended.id,
      title: "Suspended user listing (visibility check)",
      description: "This listing exists to demonstrate suspended-account states.",
      categorySlug: "stationery",
      offerType: "sale",
      priceMinor: 5000,
      condition: "new",
      availability: "available",
    },
  ];

  for (const listing of demoListings) {
    const existing = await prisma.listing.findFirst({ where: { title: listing.title } });
    if (existing) {
      continue;
    }
    await prisma.listing.create({
      data: {
        ownerId: listing.ownerId,
        title: listing.title,
        description: listing.description,
        categoryId: categories[listing.categorySlug]!,
        offerType: listing.offerType,
        priceMinor: listing.priceMinor,
        condition: listing.condition,
        availability: listing.availability,
        version: 1,
      },
    });
  }

  console.log("Seed complete:");
  console.log("  Student A (owner):      a.student@campus.example");
  console.log("  Student B (interested): b.student@campus.example");
  console.log("  Unverified eligible:    unverified@campus.example");
  console.log("  Ineligible domain:      outside@gmail.example");
  console.log(`  Administrator:          admin@campus.example`);
  console.log("  Suspended student:     suspended@campus.example");
  console.log(`All seeded accounts use the local DEV_SEED_PASSWORD.`);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
