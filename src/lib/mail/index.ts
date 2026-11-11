import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SinkMessage extends MailMessage {
  id: string;
  createdAt: string;
}

/**
 * Mail adapter selection.
 *
 * "sink" is the explicit development mail adapter: it captures outbound mail
 * in a local directory so the verification flow can be demonstrated without
 * a real mail provider. It never bypasses verification - the token flow is
 * fully executed; only the transport is local.
 *
 * "smtp" sends through a configured SMTP server (staging/production).
 * Production startup rejects the sink adapter (see env.ts).
 */

function sinkDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.mailSinkDir);
}

async function sendViaSink(message: MailMessage): Promise<void> {
  const dir = sinkDir();
  await mkdir(dir, { recursive: true });
  const record: SinkMessage = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  await writeFile(path.join(dir, `${record.createdAt.replace(/[:.]/g, "-")}-${record.id}.json`), JSON.stringify(record, null, 2));
}

async function sendViaSmtp(message: MailMessage): Promise<void> {
  if (!env.smtpUrl) {
    throw new Error("SMTP_URL is not configured");
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(env.smtpUrl);
  try {
    await transport.sendMail({
      from: env.smtpFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } finally {
    transport.close();
  }
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (env.mailAdapter === "smtp") {
    await sendViaSmtp(message);
    return;
  }
  await sendViaSink(message);
}

export function isDevelopmentMailboxEnabled(): boolean {
  return env.mailAdapter === "sink" && !env.isProduction;
}

/** Lists messages captured by the development mail sink (newest first). */
export async function readMailSink(limit = 50): Promise<SinkMessage[]> {
  const dir = sinkDir();
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const messages: SinkMessage[] = [];
  for (const file of files.filter((f) => f.endsWith(".json")).sort().slice(-limit * 2)) {
    try {
      const content = await readFile(path.join(dir, file), "utf8");
      messages.push(JSON.parse(content) as SinkMessage);
    } catch {
      // ignore unreadable/corrupt sink files
    }
  }
  return messages.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}
