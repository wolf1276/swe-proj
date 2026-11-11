/**
 * Performance seed (goal.md NFR-4: at least 1,000 registered users must be
 * represented in capacity testing).
 *
 * Creates 1,000 synthetic users and ~5,000 listings in the database pointed
 * at by DATABASE_URL (use the campustrade_perf database in local runs).
 * All data is synthetic; no real student data.
 *
 * Usage: pnpm perf:seed   (tsx scripts/perf-seed.ts)
 */
import { assertTestDatabase } from "./test-database";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const USER_COUNT = 1000;
const LISTINGS_PER_USER = 5;

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  assertTestDatabase(url);
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingCategories = await prisma.category.findMany();
    if (existingCategories.length === 0) {
      const slugs = [
        "textbooks",
        "lab-equipment",
        "stationery",
        "furniture",
        "hostel-items",
        "other-academic-items",
      ];
      for (let i = 0; i < slugs.length; i++) {
        await prisma.category.create({
          data: { slug: slugs[i]!, name: slugs[i]!, sortOrder: i + 1 },
        });
      }
    }
    const categories = await prisma.category.findMany();
    const categoryIds = categories.map((category) => category.id);

    console.log(`Creating ${USER_COUNT} synthetic users...`);
    const userIds: string[] = [];
    const userBatchSize = 100;
    for (let batch = 0; batch < USER_COUNT / userBatchSize; batch++) {
      await prisma.user.createMany({
        data: Array.from({ length: userBatchSize }, (_, i) => {
          const index = batch * userBatchSize + i;
          return {
            id: randomUUID(),
            email: `perf.user${index}@campus.example`,
            name: `Perf User ${index}`,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            role: "user" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
        skipDuplicates: true,
      });
      // Fetch ids for the created emails.
      const emails = Array.from(
        { length: userBatchSize },
        (_, i) => `perf.user${batch * userBatchSize + i}@campus.example`
      );
      const rows = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
      userIds.push(...rows.map((row) => row.id));
    }
    console.log(`Created ${userIds.length} users.`);

    const passwordHash = await hashPassword(process.env.DEV_SEED_PASSWORD ?? "local-seed-pass-1234");
    await prisma.account.createMany({
      data: userIds.map(userId => ({ id: randomUUID(), userId, providerId: "credential", accountId: userId, password: passwordHash })),
      skipDuplicates: true,
    });
    console.log(`Credential accounts prepared for ${userIds.length} synthetic registered users.`);

    console.log(`Creating ${userIds.length * LISTINGS_PER_USER} listings...`);
    const listingBatchSize = 250;
    let listingTotal = 0;
    for (let batch = 0; batch * listingBatchSize < userIds.length * LISTINGS_PER_USER; batch++) {
      const rows: {
        id: string;
        ownerId: string;
        title: string;
        description: string;
        categoryId: string;
        offerType: "sale" | "donation";
        priceMinor: number | null;
        condition: "new" | "good" | "fair";
        availability: "available" | "unavailable";
        version: number;
      }[] = [];
      for (let i = 0; i < listingBatchSize; i++) {
        const globalIndex = batch * listingBatchSize + i;
        const ownerIndex = Math.floor(globalIndex / LISTINGS_PER_USER);
        if (ownerIndex >= userIds.length) {
          break;
        }
        const offerType = globalIndex % 4 === 0 ? "donation" : "sale";
        rows.push({
          id: `00000000-0000-4000-8000-${String(globalIndex).padStart(12, "0")}`,
          ownerId: userIds[ownerIndex]!,
          title: `Perf listing ${globalIndex}: ${
            ["textbook", "lamp", "chair", "calculator", "notebook"][globalIndex % 5]
          }`,
          description: "Synthetic performance seed listing.",
          categoryId: categoryIds[globalIndex % categoryIds.length]!,
          offerType,
          priceMinor: offerType === "sale" ? ((globalIndex % 200) + 1) * 1000 : null,
          condition: (["new", "good", "fair"] as const)[globalIndex % 3],
          availability: globalIndex % 10 === 0 ? "unavailable" : "available",
          version: 1,
        });
      }
      if (rows.length > 0) {
        await prisma.listing.createMany({ data: rows, skipDuplicates: true });
        listingTotal += rows.length;
      }
    }
    console.log(`Created ${listingTotal} listings.`);
    const counts = {
      users: await prisma.user.count(),
      listings: await prisma.listing.count(),
    };
    console.log("Database totals:", counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Performance seed failed:", error);
  process.exitCode = 1;
});
