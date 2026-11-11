/** Test-only local HTTPS and SMTP services. Never imported by the app. */
import https from "node:https";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";

export async function startTestSmtp(port: number, directory: string) {
  await mkdir(directory, { recursive: true });
  const smtp = new SMTPServer({
    authOptional: true, disabledCommands: ["AUTH", "STARTTLS"], logger: false,
    onRcptTo(address, _session, callback) {
      callback(address.address.endsWith(".example") ? undefined : new Error("Local tests accept reserved .example recipients only"));
    },
    onData(stream, session, callback) {
      simpleParser(stream).then(async mail => {
        const record = { id: randomUUID(), createdAt: new Date().toISOString(), to: session.envelope.rcptTo[0]?.address, subject: mail.subject, text: mail.text ?? "" };
        await writeFile(`${directory}/${record.createdAt.replace(/[:.]/g, "-")}-${record.id}.json`, JSON.stringify(record));
        callback();
      }).catch(callback);
    },
  });
  await new Promise<void>((resolve, reject) => { smtp.on("error", reject); smtp.listen(port, "127.0.0.1", resolve); });
  return smtp;
}
export async function startTestHttps(port: number, upstreamPort: number) {
  const directory = ".test-runtime";
  mkdirSync(directory, { recursive: true });
  if (!existsSync(`${directory}/localhost.key`) || !existsSync(`${directory}/localhost.crt`)) {
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", `${directory}/localhost.key`, "-out", `${directory}/localhost.crt`, "-days", "2", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"], { stdio: "ignore" });
  }
  const server = https.createServer({ key: readFileSync(`${directory}/localhost.key`), cert: readFileSync(`${directory}/localhost.crt`) }, (request, response) => {
    const proxy = http.request({ hostname: "127.0.0.1", port: upstreamPort, path: request.url, method: request.method, headers: { ...request.headers, "x-forwarded-proto": "https", "x-forwarded-host": `localhost:${port}` } }, upstream => {
      response.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(response);
    });
    proxy.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end("Starting local app"); });
    request.pipe(proxy);
  });
  await new Promise<void>((resolve, reject) => { server.on("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return server;
}
