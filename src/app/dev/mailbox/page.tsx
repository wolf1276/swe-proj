import Link from "next/link";
import { isDevelopmentMailboxEnabled, readMailSink } from "@/lib/mail";
import { Card, PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Development-only mail sink viewer. Exists only when MAIL_ADAPTER=sink in a
 * non-production deployment. This is a transport inspection tool for local
 * demos (demo.md), not a verification bypass.
 */
export default async function DevMailboxPage() {
  if (!isDevelopmentMailboxEnabled()) {
    return (
      <PageShell>
        <Card>
          <h1 className="text-xl font-semibold text-ink">Not found</h1>
          <p className="mt-2 text-ink-muted">This page is only available in local development.</p>
        </Card>
      </PageShell>
    );
  }
  const messages = await readMailSink(50);

  function extractLink(text: string): string | null {
    const match = text.match(/https?:\/\/\S+/);
    return match ? match[0] : null;
  }

  return (
    <PageShell>
      <h1 className="mb-2 text-2xl font-semibold text-ink">Development mailbox</h1>
      <p className="mb-6 text-ink-muted">
        Outgoing email is captured locally (MAIL_ADAPTER=sink). Use the links below to complete
        email verification during development. This tool never exists in production.
      </p>
      {messages.length === 0 ? (
        <Card>
          <p className="text-ink-muted">No messages captured yet.</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {messages.map((message) => {
            const link = extractLink(message.text);
            return (
              <li key={message.id}>
                <Card>
                  <p className="font-semibold text-ink">{message.subject}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    To: {message.to} - {new Date(message.createdAt).toLocaleString()}
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-paper p-3 text-sm text-ink">
                    {message.text}
                  </pre>
                  {link ? (
                    <p className="mt-2">
                      <a href={link} className="text-accent underline">
                        Open verification link
                      </a>
                    </p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6">
        <Link href="/listings" className="text-accent underline">
          Back to listings
        </Link>
      </p>
    </PageShell>
  );
}
