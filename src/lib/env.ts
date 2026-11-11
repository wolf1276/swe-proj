import { z } from "zod";

/**
 * Validated application configuration.
 *
 * Fail-closed rules:
 * - production requires BETTER_AUTH_SECRET (>= 32 chars), APP_URL, a
 *   non-empty APPROVED_DOMAINS allowlist, and the SMTP mail adapter
 *   (the development sink adapter is rejected in production);
 * - the development defaults use reserved documentation-only values
 *   (RFC 2606 .example) and are never treated as approved college domains.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  APPROVED_DOMAINS: z.string().default("campus.example"),
  MAIL_ADAPTER: z.enum(["sink", "smtp"]).default("sink"),
  MAIL_SINK_DIR: z.string().default(".mailsink"),
  SMTP_URL: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  DEV_SEED_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid application configuration: ${issues}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === "production";
// Next.js builds run with NODE_ENV=production while collecting page data;
// the strict production guards below are runtime deployment checks, so the
// build phase is exempt (module code must be loadable for analysis).
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (isProduction && !isBuildPhase) {
  if (!raw.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  if (!process.env.APP_URL || !raw.APP_URL.startsWith("https://")) {
    throw new Error("Explicit HTTPS APP_URL is required in production");
  }
  if (!process.env.APPROVED_DOMAINS?.trim()) {
    throw new Error("APPROVED_DOMAINS must not be empty in production");
  }
  if (raw.MAIL_ADAPTER !== "smtp" || !raw.SMTP_URL || !raw.SMTP_FROM) {
    throw new Error(
      "Production requires MAIL_ADAPTER=smtp with SMTP_URL and SMTP_FROM; the development mail sink is not allowed in production"
    );
  }
}

/** Approved campus email domains; matched exactly after normalization. */
export const approvedDomains: readonly string[] = raw.APPROVED_DOMAINS.split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction,
  databaseUrl: raw.DATABASE_URL,
  appUrl: raw.APP_URL.replace(/\/$/, ""),
  authSecret: raw.BETTER_AUTH_SECRET,
  mailAdapter: raw.MAIL_ADAPTER,
  mailSinkDir: raw.MAIL_SINK_DIR,
  smtpUrl: raw.SMTP_URL,
  smtpFrom: raw.SMTP_FROM,
  devSeedPassword: raw.DEV_SEED_PASSWORD,
} as const;

export const appOrigin: string = (() => {
  try {
    return new URL(env.appUrl).origin;
  } catch {
    throw new Error(`APP_URL is not a valid URL: ${env.appUrl}`);
  }
})();

/**
 * Whether an email address belongs to an approved campus domain.
 * The domain must match an allowlist entry exactly: suffix lookalikes
 * such as allowed.example.attacker.example are rejected.
 */
export function isEligibleCampusEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!z.email().safeParse(normalized).success) return false;
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1);
  return approvedDomains.includes(domain);
}
