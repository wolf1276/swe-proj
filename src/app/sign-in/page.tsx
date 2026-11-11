"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ErrorSummary } from "@/components/ui";

export default function SignInPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setErrors([error.message ?? "Sign-in failed. Please try again."]);
        return;
      }
      router.push("/listings");
      router.refresh();
    } catch {
      setErrors(["Network error. Please try again."]);
    } finally { setBusy(false); }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-md px-4 pb-16 pt-10">
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-ink-muted">
        Use your verified campus email address.
      </p>
      <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <fieldset disabled={!hydrated || busy} className="contents">
        <ErrorSummary messages={errors} />
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
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-ink"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="button-target w-full rounded border border-accent bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
        </fieldset>
      </form>
      <p className="mt-4 text-ink-muted">
        No account yet?{" "}
        <Link href="/sign-up" className="text-accent underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
