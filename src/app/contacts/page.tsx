import { RetryNotificationButton } from "@/components/retry-notification-button";
import { redirect } from "next/navigation";
import { getServerActor } from "@/lib/session-server";
import { listMyContacts } from "@/lib/domain/contacts";
import { Badge, Card, EmptyState, PageShell } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Participant-scoped contact records (FR-6, security.md: only participants
 * see counterpart names/emails after explicit contact sharing).
 */
export default async function ContactsPage() {
  const actor = await getServerActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!actor.studentEligible) {
    redirect("/listings");
  }
  const contacts = await listMyContacts(actor);
  const sent = contacts.filter((c) => c.direction === "sent");
  const received = contacts.filter((c) => c.direction === "received");

  function ContactCard({ contact }: { contact: (typeof contacts)[number] }) {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-ink">
            <a href={`/listings/${contact.listing.id}`} className="hover:text-accent">
              {contact.listing.title}
            </a>
          </h3>
          <Badge tone={contact.direction === "sent" ? "accent" : "neutral"}>
            {contact.direction === "sent"
              ? `You contacted ${contact.counterpart.name}`
              : `${contact.counterpart.name} contacted you`}
          </Badge>
        </div>
        <p className="mt-2"><a className="text-accent underline" href={`mailto:${contact.counterpart.email}`}>Email {contact.counterpart.name}</a></p>
        {contact.message ? (
          <p className="mt-2 whitespace-pre-wrap text-ink">{contact.message}</p>
        ) : (
          <p className="mt-2 text-ink-muted">(no message)</p>
        )}
        <p className="mt-2 text-sm text-ink-muted">
          {new Date(contact.createdAt).toLocaleString()} - notification{" "}
          {contact.notificationStatus === "sent"
            ? "accepted by mail adapter"
            : contact.notificationStatus === "failed"
              ? "delivery failed"
              : "pending"}
        </p>
        {contact.notificationStatus === "failed" ? <RetryNotificationButton contactId={contact.id} /> : null}
        {contact.direction === "sent" ? (
          <p className="mt-1 text-sm text-ink-muted">
            Arrange payment and collection directly with the owner.
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <PageShell>
      <h1 className="mb-6 text-2xl font-semibold text-ink">My contacts</h1>
      {contacts.length === 0 ? (
        <EmptyState
          title="No contact activity yet"
          description="When you express interest in an item or someone expresses interest in yours, the record appears here."
        />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="sent-heading">
            <h2 id="sent-heading" className="mb-3 text-lg font-semibold text-ink">
              Interest you expressed ({sent.length})
            </h2>
            {sent.length === 0 ? (
              <p className="text-ink-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {sent.map((contact) => (
                  <li key={contact.id}>
                    <ContactCard contact={contact} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="received-heading">
            <h2 id="received-heading" className="mb-3 text-lg font-semibold text-ink">
              Interest in your items ({received.length})
            </h2>
            {received.length === 0 ? (
              <p className="text-ink-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {received.map((contact) => (
                  <li key={contact.id}>
                    <ContactCard contact={contact} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
