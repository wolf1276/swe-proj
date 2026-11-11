import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { appOrigin, env, isEligibleCampusEmail } from "@/lib/env";
import { issueVerificationProof } from "@/lib/verification-proof";
import { sendMail } from "@/lib/mail";

/**
 * Better Auth configuration for CampusTrade.
 *
 * Access model (see security.md and decisions.md D02/D11):
 * - Email/password sign-up is open only to approved campus email domains
 *   (validateUserInfo rejects other domains before any user row is created).
 * - A matching domain alone is not sufficient: sessions are only issued
 *   after the mailbox is verified (requireEmailVerification), and marketplace
 *   access additionally requires an active (non-banned) account.
 * - The admin plugin provides the operator-managed admin role and the
 *   ban/unban (suspend/reactivate) operations used by FR-8.
 */
export const auth = betterAuth({
  baseURL: env.appUrl,
  secret: env.authSecret,
  trustedOrigins: [appOrigin],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url, token }) => {
      await issueVerificationProof(token, user.id);
      // Fire without awaiting (recommended to avoid timing signals).
      sendMail({
        to: user.email,
        subject: "Verify your CampusTrade email",
        text: [
          "Welcome to CampusTrade.",
          "",
          "Confirm your campus email address by opening the link below:",
          url,
          "",
          "The link expires in one hour and can be used only once.",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: [
          "<p>Welcome to CampusTrade.</p>",
          '<p>Confirm your campus email address by opening the link below. ',
          "The link expires in one hour and can be used only once.</p>",
          `<p><a href="${url}">Verify your email</a></p>`,
          "<p>If you did not request this, you can ignore this email.</p>",
        ].join(""),
      }).catch(() => {
        console.error("[mail] verification email delivery failed");
      });
    },
  },
  databaseHooks: {
    user: {
      update: {
        before: async (data, context) => {
          // Commit mailbox proof with the provider's verification flag in
          // the same write, avoiding an inconsistent state on DB failure.
          if (data.emailVerified === true && context?.path === "/verify-email") {
            return { data: { ...data, emailVerifiedAt: new Date() } };
          }
          return { data };
        },
      },
    },
  },
  user: {
    additionalFields: {
      emailVerifiedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
    validateUserInfo: async (data) => {
      // Gate account provisioning on the approved campus domain allowlist.
      // Runs before public user creation; operator-provisioned administrators
      // are independent of student eligibility.
      if (
        (data.source.action === "create-user" || data.source.action === "link-account") &&
        !isEligibleCampusEmail(String(data.user.email ?? ""))
      ) {
        return {
          error: "EMAIL_DOMAIN_NOT_ALLOWED",
          errorDescription:
            "Only approved campus email domains can register for CampusTrade. Contact the administrator if you believe this is an error.",
        };
      }
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      bannedUserMessage:
        "Your CampusTrade account has been suspended. Please contact the administrator if you believe this is an error.",
    }),
  ],
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 20 },
      "/sign-up/email": { window: 600, max: 10 },
      "/verify-email": { window: 600, max: 20 },
      "/send-verification-email": { window: 600, max: 10 },
    },
  },
});
