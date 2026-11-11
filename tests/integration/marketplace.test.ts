import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireAdmin, requireStudent } from "@/lib/http";
import { createListing, updateListing, searchListings, getVisibleListing, deleteOwnListing } from "@/lib/domain/listings";
import { expressInterest, listMyContacts, getContactForActor } from "@/lib/domain/contacts";
import { reportListing, resolveReport } from "@/lib/domain/reports";
import { setUserStatus } from "@/lib/domain/users";
import { listingInputSchema, listingUpdateSchema } from "@/lib/validation";
import { GET as listRoute } from "@/app/api/listings/route";
import { PATCH as updateRoute } from "@/app/api/listings/[id]/route";
import { POST as resolveRoute } from "@/app/api/admin/reports/[id]/resolve/route";

const origin = "http://localhost:3000";
const ids: string[] = Array.from({ length: 6 }, () => randomUUID());
const [ownerId, buyerId, outsiderId, adminId, dualId, unverifiedId] = ids;
const owner = { userId: ownerId, role: "user" as const, name: "Owner", email: "owner@campus.example" };
const buyer = { userId: buyerId, role: "user" as const, name: "Buyer", email: "buyer@campus.example" };
const admin = { userId: adminId, role: "admin" as const };
let categoryId: string;
const cookies = new Map<string, string>();
function req(userId?: string, method = "GET", body?: unknown) {
  return new Request(`${origin}/api/listings`, { method, headers: { origin, "content-type": "application/json", ...(userId ? { cookie: cookies.get(userId)! } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function input(overrides = {}) {
  return listingInputSchema.parse({ title: "Integration textbook", description: "Persistent test item", categoryId, offerType: "sale", priceMinor: 25000, condition: "good", ...overrides });
}
async function listing(overrides = {}) { return createListing(owner, input(overrides)); }
function edit(item: Awaited<ReturnType<typeof listing>>, overrides = {}) {
  return listingUpdateSchema.parse({ ...input(), version: item.version, ...overrides });
}
beforeAll(async () => {
  // Delete only records tagged to this run, never truncate a shared DB.
  for (const [i, id] of ids.entries()) {
    const email = i === 2 || i === 3 ? `test-${id}@outside.example` : `test-${id}@campus.example`;
    await prisma.user.create({ data: { id, email, name: `Integration ${i}`, role: i === 3 || i === 4 ? "admin" : "user", emailVerified: i !== 5, emailVerifiedAt: i !== 5 ? new Date() : null, banned: false } });
    const token = randomUUID();
    await prisma.session.create({ data: { id: randomUUID(), token, userId: id, expiresAt: new Date(Date.now() + 3600000) } });
    // Use provider cookie signing, not a fake/mocked getSession.
    const context = await auth.$context;
    const { makeSignature } = await import("better-auth/crypto");
    cookies.set(id, `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${await makeSignature(token, context.secret)}`)}`);
  }
  const category = await prisma.category.create({ data: { slug: `integration-${randomUUID()}`, name: "Integration books" } });
  categoryId = category.id;
});
afterAll(async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: ids.map(id => `test:${id}`) } } });
  await prisma.auditEvent.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.contactRequest.deleteMany({ where: { OR: [{ requesterId: { in: ids } }, { ownerId: { in: ids } }] } });
  await prisma.listingReport.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { listing: { ownerId: { in: ids } } }] } });
  await prisma.listing.deleteMany({ where: { ownerId: { in: ids } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("TC-I01 access decision table and real session guards", () => {
  for (const [label, id, studentAllowed, adminAllowed] of [
    ["R1/R3 student", ownerId, true, false], ["R2/R4 dual", dualId, true, true],
    ["R5/R7 unverified", unverifiedId, false, false], ["R6/R8 admin without student eligibility", adminId, false, true],
    ["outside", outsiderId, false, false],
  ] as const) it(label, async () => {
    if (studentAllowed) await expect(requireStudent(req(id))).resolves.toMatchObject({ userId: id });
    else await expect(requireStudent(req(id))).rejects.toMatchObject({ status: 403 });
    if (adminAllowed) await expect(requireAdmin(req(id))).resolves.toMatchObject({ userId: id });
    else await expect(requireAdmin(req(id))).rejects.toMatchObject({ status: 403 });
  });
  it("operator verification flag alone does not establish student mailbox ownership", async () => {
    await prisma.user.update({ where: { id: dualId }, data: { emailVerifiedAt: null } });
    await expect(requireStudent(req(dualId))).rejects.toMatchObject({ status: 403 });
    await expect(requireAdmin(req(dualId))).resolves.toMatchObject({ userId: dualId });
    await prisma.user.update({ where: { id: dualId }, data: { emailVerifiedAt: new Date() } });
  });
  it("anonymous direct API denied", async () => { expect((await listRoute(req())).status).toBe(401); });
  it("suspended admin with a pre-existing session denied", async () => {
    await prisma.user.update({ where: { id: dualId }, data: { banned: true } });
    await expect(requireAdmin(req(dualId))).rejects.toMatchObject({ status: 403 });
    await expect(requireStudent(req(dualId))).rejects.toMatchObject({ status: 403 });
    await prisma.user.update({ where: { id: dualId }, data: { banned: false } });
  });
});

describe("TC-I02 persistence, ownership and concurrent edits", () => {
  it("sale and donation persist; zero sale stays distinct", async () => {
    const sale = await listing({ priceMinor: 0 });
    const donation = await listing({ offerType: "donation", priceMinor: 0 });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: sale.id } })).priceMinor).toBe(0);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: donation.id } })).priceMinor).toBeNull();
    expect(donation.offerType).toBe("donation");
  });
  it("direct cross-owner writes and submitted ownership denied", async () => {
    const item = await listing();
    expect((await updateRoute(req(buyerId, "PATCH", edit(item)), { params: Promise.resolve({ id: item.id }) })).status).toBe(404);
    expect((await updateRoute(req(ownerId, "PATCH", { ...edit(item), ownerId: buyerId }), { params: Promise.resolve({ id: item.id }) })).status).toBe(400);
    await expect(deleteOwnListing(buyer, item.id)).rejects.toMatchObject({ status: 404 });
  });
  it("one concurrent edit wins and stale edit conflicts", async () => {
    const item = await listing();
    const results = await Promise.allSettled([updateListing(owner, item.id, edit(item, { title: "Changed textbook A" })), updateListing(owner, item.id, edit(item, { title: "Changed textbook B" }))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected").map(r => r.reason.status)).toEqual([409]);
  });
});

describe("TC-I03 persisted search and filter semantics", () => {
  it("combines text/category/price/condition/availability and pagination", async () => {
    const tag = randomUUID();
    const item = await listing({ title: `Textbook ${tag}`, priceMinor: 12300, condition: "fair" });
    const result = await searchListings({ q: tag, categoryId, condition: "fair", minPriceMinor: 12300, maxPriceMinor: 12300, availability: "available" });
    expect(result.items.map(i => i.id)).toEqual([item.id]);
    expect((await searchListings({ q: tag, minPriceMinor: 12301 })).total).toBe(0);
    await updateListing(owner, item.id, edit(item, { title: item.title, availability: "unavailable" }));
    expect((await searchListings({ q: tag })).total).toBe(0);
    expect((await searchListings({ q: tag, availability: "unavailable" })).total).toBe(1);
    const page = await searchListings({ categoryId });
    expect(page.items.length).toBeLessThanOrEqual(20);
    expect((await searchListings({ categoryId, page: 100 })).items).toEqual([]);
  });
  it("stable pagination spans persisted pages without duplicates or missing items", async () => {
    const tag = randomUUID();
    await prisma.listing.createMany({ data: Array.from({ length: 45 }, (_, index) => ({ ownerId, categoryId, title: `Pagination ${tag} ${index}`, description: "Synthetic page fixture", offerType: "sale" as const, priceMinor: 100, condition: "good" as const, availability: "available" as const, createdAt: new Date(1700000000000 + index) })) });
    const pages = await Promise.all([1, 2, 3].map(page => searchListings({ q: tag, page })));
    expect(pages.map(page => page.items.length)).toEqual([20, 20, 5]);
    expect(new Set(pages.flatMap(page => page.items.map(item => item.id))).size).toBe(45);
    expect((await searchListings({ q: tag })).items.map(item => item.id)).toEqual(pages[0].items.map(item => item.id));
  });
  it("donations match inclusive zero price bounds", async () => {
    const item = await listing({ offerType: "donation", priceMinor: 0 });
    expect((await searchListings({ categoryId, minPriceMinor: 0, maxPriceMinor: 0 })).items.map(i => i.id)).toContain(item.id);
  });
});

describe("TC-I04 contacts, reporting, atomic moderation and user management", () => {
  it("durable participant contact, idempotency and contact email privacy", async () => {
    const item = await listing();
    const results = await Promise.all([expressInterest(buyer, item.id, { message: "Interested", idempotencyKey: "retry" }), expressInterest(buyer, item.id, { message: "retry" })]);
    expect(new Set(results.map(r => r.contact.id)).size).toBe(1);
    expect(results.filter(r => r.created)).toHaveLength(1);
    expect((await listMyContacts(owner)).some(c => c.counterpart.email.endsWith("@campus.example"))).toBe(true);
    expect(await listMyContacts({ userId: outsiderId })).toEqual([]);
    await expect(getContactForActor({ userId: outsiderId }, results[0].contact.id)).rejects.toMatchObject({ status: 404 });
    await expect(expressInterest(owner, item.id, {})).rejects.toMatchObject({ status: 403 });
    await deleteOwnListing(owner, item.id);
    expect(await getContactForActor(buyer, results[0].contact.id)).toMatchObject({ message: results.find(r => r.created)!.contact.message });
  });
  it("failed mail keeps durable contact and supports safe participant coordination", async () => {
    const { vi } = await import("vitest");
    const mail = await import("@/lib/mail");
    const spy = vi.spyOn(mail, "sendMail").mockRejectedValueOnce(new Error("synthetic mail failure"));
    try {
      const item = await listing();
      const result = await expressInterest(buyer, item.id, {});
      expect(result.contact.notificationStatus).toBe("failed");
      expect((await listMyContacts(buyer)).map(c => c.id)).toContain(result.contact.id);
      expect((await expressInterest(buyer, item.id, {})).created).toBe(false);
      const { retryContactNotification } = await import("@/lib/domain/contacts");
      expect((await retryContactNotification(buyer, result.contact.id)).notificationStatus).toBe("sent");
      await expect(retryContactNotification({ userId: outsiderId }, result.contact.id)).rejects.toMatchObject({ status: 404 });
    } finally { spy.mockRestore(); }
  });
  it("duplicate reports and concurrent moderation resolve exactly once", async () => {
    const item = await listing();
    const reports = await Promise.allSettled([reportListing(buyer, item.id, { reason: "misleading" }), reportListing(buyer, item.id, { reason: "spam" })]);
    expect(reports.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const report = reports.find(r => r.status === "fulfilled")!;
    if (report.status !== "fulfilled") throw new Error("missing report");
    expect((await searchListings({ categoryId })).items.map(i => i.id)).toContain(item.id);
    expect((await resolveRoute(req(buyerId, "POST", { action: "remove", reviewReason: "Reviewed" }), { params: Promise.resolve({ id: report.value.reportId }) })).status).toBe(403);
    const results = await Promise.allSettled([resolveReport(admin, report.value.reportId, { action: "remove", reviewReason: "Misleading item reviewed" }), resolveReport(admin, report.value.reportId, { action: "dismiss", reviewReason: "Concurrent review" })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected").map(r => r.reason.status)).toEqual([409]);
    const stored = await prisma.listing.findUniqueOrThrow({ where: { id: item.id } });
    if (stored.moderationState === "removed") {
      await expect(getVisibleListing({ ...owner, role: "admin" }, item.id)).rejects.toMatchObject({ status: 404 });
      await expect(updateListing(owner, item.id, edit(item))).rejects.toMatchObject({ status: 409 });
      await expect(expressInterest(buyer, item.id, {})).rejects.toMatchObject({ status: 404 });
    }
    expect(await prisma.auditEvent.count({ where: { targetId: report.value.reportId } })).toBe(1);
  });
  it("suspend revokes sessions, audit persists, reactivate does not resurrect them", async () => {
    await setUserStatus(admin, buyerId, { action: "suspend", reason: "Integration review" });
    expect(await prisma.session.count({ where: { userId: buyerId } })).toBe(0);
    await expect(requireStudent(req(buyerId))).rejects.toMatchObject({ status: 401 });
    await setUserStatus(admin, buyerId, { action: "reactivate" });
    await expect(requireStudent(req(buyerId))).rejects.toMatchObject({ status: 401 });
    await expect(setUserStatus(admin, adminId, { action: "suspend" })).rejects.toMatchObject({ code: "CANNOT_SUSPEND_SELF" });
  });
});

 it("shared mutation rate limit counts concurrent submissions atomically", async () => {
   const { limitMutation } = await import("@/lib/rate-limit");
   const results = await Promise.allSettled(Array.from({ length: 5 }, () => limitMutation(ownerId, "test", 3)));
   expect(results.filter(r => r.status === "fulfilled")).toHaveLength(3);
   expect(results.filter(r => r.status === "rejected").map(r => r.reason.status)).toEqual([429, 429]);
 });

 it("verification receipts are expiring and atomically single-use", async () => {
   const { issueVerificationProof, consumeVerificationProof } = await import("@/lib/verification-proof");
   const token = randomUUID();
   await issueVerificationProof(token, ownerId);
   const results = await Promise.all([consumeVerificationProof(token), consumeVerificationProof(token)]);
   expect(results.filter(Boolean)).toHaveLength(1);
   const expired = randomUUID();
   await issueVerificationProof(expired, ownerId);
   await prisma.verification.updateMany({ where: { value: ownerId }, data: { expiresAt: new Date(0) } });
   expect(await consumeVerificationProof(expired)).toBe(false);
   await prisma.verification.deleteMany({ where: { value: ownerId } });
 });

 it("admin search returns matching users with stable pagination", async () => {
   const { listUsers } = await import("@/lib/domain/users");
   const result = await listUsers({ q: `test-${ownerId}` });
   expect(result.total).toBe(1);
   expect(result.items[0].id).toBe(ownerId);
   expect((await listUsers({ q: "Integration", page: 100 })).items).toEqual([]);
 });
 it("concurrent administrators cannot suspend every active administrator", async () => {
   const results = await Promise.allSettled([
     setUserStatus(admin, dualId, { action: "suspend", reason: "Concurrent admin regression" }),
     setUserStatus({ userId: dualId }, adminId, { action: "suspend", reason: "Concurrent admin regression" }),
   ]);
   expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
   expect(await prisma.user.count({ where: { id: { in: [adminId, dualId] }, banned: false } })).toBe(1);
 });

 it("provider verification commits the mailbox flag and student proof together", async () => {
   const id = randomUUID(); ids.push(id);
   const email = `proof-${id}@campus.example`;
   await prisma.user.create({ data: { id, email, name: "Proof integration", emailVerified: false } });
   const { signJWT } = await import("better-auth/crypto");
   const token = await signJWT({ email, userId: id }, (await auth.$context).secret, 3600);
   const { issueVerificationProof } = await import("@/lib/verification-proof");
   await issueVerificationProof(token, id);
   const { GET } = await import("@/app/api/auth/[...all]/route");
   const response = await GET(new Request(`${origin}/api/auth/verify-email?token=${token}`));
   expect(response.status).toBe(200);
   const user = await prisma.user.findUniqueOrThrow({ where: { id } });
   expect(user.emailVerified).toBe(true);
   expect(user.emailVerifiedAt).toBeInstanceOf(Date);
   expect((await GET(new Request(`${origin}/api/auth/verify-email?token=${token}`))).status).toBe(302);
 });

 it("operator CLI provisions admin login without granting student mailbox proof", async () => {
   const { execFileSync } = await import("node:child_process");
   const email = `operator-${randomUUID()}@campus.example`;
   const password = "synthetic-operator-pass-1234";
   execFileSync("pnpm", ["exec", "tsx", "scripts/create-admin.ts"], { env: { ...process.env, ADMIN_EMAIL: email, ADMIN_PASSWORD: password }, stdio: "pipe" });
   const user = await prisma.user.findUniqueOrThrow({ where: { email } });
   ids.push(user.id);
   expect(user.role).toBe("admin");
   expect(user.emailVerifiedAt).toBeNull();
   const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
   expect(response.status).toBe(200);
   cookies.set(user.id, response.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; "));
   await expect(requireAdmin(req(user.id))).resolves.toMatchObject({ userId: user.id });
   await expect(requireStudent(req(user.id))).rejects.toMatchObject({ status: 403 });
   expect(() => execFileSync("pnpm", ["exec", "tsx", "scripts/create-admin.ts"], { env: { ...process.env, ADMIN_EMAIL: "invalid", ADMIN_PASSWORD: password }, stdio: "pipe" })).toThrow();
 });
