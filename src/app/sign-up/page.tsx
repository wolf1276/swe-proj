"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ErrorSummary } from "@/components/ui";

export default function SignUpPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const response = await fetch("/api/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: "/verify-email",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string };
        };
        setErrors([
          body.error?.message ?? "Sign-up failed. Please try again.",
        ]);
        return;
      }
      setSubmitted(true);
    } catch {
      setErrors(["Network error. Please try again."]);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  if (submitted) {
    return (
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-10">
        <h1 className="text-2xl font-semibold text-ink">Check your email</h1>
        <p className="mt-2 text-ink-muted">
          We sent a verification link to <strong>{email}</strong>. Open it to
          activate your account. The link expires in one hour and can be used once.
        </p>
        <p className="mt-4 text-ink-muted">
          After verifying, <Link href="/sign-in" className="text-accent underline">sign in</Link> to
          start using CampusTrade.
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          Did not receive it?{" "}
          <button
            type="button"
            className="text-accent underline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { error } = await authClient.sendVerificationEmail({
                email,
                callbackURL: "/verify-email",
              });
              setBusy(false);
              if (error) {
                setErrors([error.message ?? "Could not resend. Try again later."]);
              }
            }}
          >
            Resend verification email
          </button>
        </p>
        <div className="mt-4">
          <ErrorSummary messages={errors} />
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-10">
      <h1 className="text-2xl font-semibold text-ink">Create your student account</h1>
      <p className="mt-1 text-ink-muted">
        Sign-up is limited to approved campus email domains. Your mailbox must be
        verified before you can browse, post or contact other students.
      </p>
      <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <fieldset disabled={!hydrated || busy} className="contents">
        <ErrorSummary messages={errors} />
        <div>
          <label htmlFor="name" className="mb-1 block font-medium">
            Display name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-ink"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block font-medium">
            Campus email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-ink"
          />
          <p className="mt-1 text-sm text-ink-muted">
            Only approved campus email domains can register.
          </p>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-ink"
          />
          <p className="mt-1 text-sm text-ink-muted">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="button-target w-full rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Sign up"}
        </button>
        </fieldset>
      </form>
      <p className="mt-4 text-ink-muted">
        Already registered?{" "}
        <Link href="/sign-in" className="text-accent underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
