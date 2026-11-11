import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { isEligibleCampusEmail } from "@/lib/env";

/**
 * HTTP layer for CampusTrade route handlers (api.md).
 *
 * Server-side rules enforced here:
 * - CSRF: state-changing methods require a same-origin request.
 * - Identity: the actor is derived from the session cookie on the server;
 *   submitted user IDs or roles are never trusted.
 * - Access control: requireStudent (verified mailbox + active account) and
 *   requireAdmin gate every endpoint.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Strict same-origin check for state-changing requests (CSRF defense).
 * Accepts only Origin or Sec-Fetch-Site values that match the deployment
 * origin exactly; requests without any origin signal are rejected.
 */
export function assertSameOrigin(request: Request): void {
  if (!UNSAFE_METHODS.has(request.method)) {
    return;
  }
  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = new Set<string>([appOriginValue()]);
    if (!allowed.has(origin)) {
      throw new ApiError(403, "CSRF_ORIGIN_MISMATCH", "Cross-origin requests are not allowed");
    }
    return;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin") {
    return;
  }
  throw new ApiError(403, "CSRF_MISSING_ORIGIN", "Missing same-origin request signal");
}

let cachedOrigin: string | null = null;

function appOriginValue(): string {
  if (!cachedOrigin) {
    cachedOrigin = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
  }
  return cachedOrigin;
}

/** Wraps a handler with error translation to JSON problem responses. */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    if (error instanceof ZodError) {
      const detail = error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: detail.join("; ") } },
        { status: 400 }
      );
    }
    console.error("[api] unhandled route error", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}

export interface Actor {
  userId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  /** Mailbox verified (campus domain + verified are distinct requirements). */
  emailVerified: boolean;
  /** Account is active (not suspended/banned). */
  active: boolean;
  /**
   * Marketplace eligibility: verified mailbox AND active account AND an
   * approved campus domain (re-derived at runtime, never persisted).
   */
  studentEligible: boolean;
}

/**
 * Resolves the current actor from the session cookie.
 * Returns null when there is no session (api.md: 401 for protected routes).
 */
export async function getActor(request: Request): Promise<Actor | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  let session: { user: Record<string, unknown> } | null = null;
  try {
    session = (await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    })) as { user: Record<string, unknown> } | null;
  } catch {
    return null;
  }
  if (!session?.user) {
    return null;
  }
  const user = session.user;
  const email = String(user.email ?? "");
  const emailVerified = user.emailVerified === true && user.emailVerifiedAt != null;
  const banned = user.banned === true;
  const role = user.role === "admin" ? "admin" : "user";
  const domainEligible = isEligibleCampusEmail(email);
  return {
    userId: String(user.id),
    email,
    name: String(user.name ?? ""),
    role,
    emailVerified,
    active: !banned,
    studentEligible: emailVerified && !banned && domainEligible,
  };
}

/** Requires an authenticated, active student account (marketplace access). */
export async function requireStudent(request: Request): Promise<Actor> {
  const actor = await getActor(request);
  if (!actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
  }
  if (!actor.active) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }
  if (!actor.emailVerified) {
    throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Verify your campus email to continue");
  }
  // Defense in depth: eligibility is re-derived at runtime from the account's
  // current email; an account whose mailbox left the approved domains must not
  // keep marketplace access (normally impossible via the public flows).
  if (!isEligibleCampusEmail(actor.email)) {
    throw new ApiError(403, "EMAIL_DOMAIN_NOT_ALLOWED", "Your account is no longer eligible for CampusTrade");
  }
  return actor;
}

/** Requires an authenticated admin. */
export async function requireAdmin(request: Request): Promise<Actor> {
  const actor = await getActor(request);
  if (!actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
  }
  if (!actor.active) {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }
  if (actor.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Administrator access required");
  }
  return actor;
}

/** Reads a JSON body with a size guard. */
export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Expected application/json");
  }
  const text = await request.text();
  if (text.length > 64 * 1024) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body too large");
  }
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
}
