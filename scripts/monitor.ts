/** Probe recorder. Formal availability requires an approved period/policy. */
import https from "node:https";
import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
async function main() {
  const url = new URL(process.env.MONITOR_URL ?? "");
  const seconds = Number(process.env.MONITOR_WINDOW_SECONDS ?? 60);
  const cadenceMs = Number(process.env.MONITOR_CADENCE_MS ?? 5000);
  if (!["http:", "https:"].includes(url.protocol) || !Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(cadenceMs) || cadenceMs < 100) throw new Error("Invalid monitor URL/window/cadence");
  const allowLocalCertificate = process.env.MONITOR_LOCAL_CERTIFICATE === "1" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const probes: { at: string; ok: boolean; ms: number; status: number }[] = [];
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    const start = performance.now();
    const result = await new Promise<{ ok: boolean; status: number }>(resolve => {
      const client = url.protocol === "https:" ? https : http;
      const req = client.get(url, { rejectUnauthorized: !allowLocalCertificate, timeout: 5000 }, response => {
        let text = "";
        response.on("data", chunk => { text += chunk; if (text.length > 4096) req.destroy(); });
        response.on("end", () => {
          try { const body = JSON.parse(text); resolve({ ok: response.statusCode === 200 && body.status === "ok" && body.database === "up", status: response.statusCode ?? 0 }); }
          catch { resolve({ ok: false, status: response.statusCode ?? 0 }); }
        });
      });
      req.on("timeout", () => req.destroy());
      req.on("error", () => resolve({ ok: false, status: 0 }));
    });
    probes.push({ at: new Date().toISOString(), ...result, ms: performance.now() - start });
    await new Promise(resolve => setTimeout(resolve, Math.min(cadenceMs, Math.max(0, deadline - Date.now()))));
  }
  const report = { startedAt, finishedAt: new Date().toISOString(), url: url.origin + url.pathname, requestedWindowSeconds: seconds, cadenceMs, probes, successfulProbes: probes.filter(p => p.ok).length, failedProbes: probes.filter(p => !p.ok).length, note: "Diagnostic probe record only. No approved operation window, downtime attribution or NFR-3 acceptance is implied." };
  await mkdir("tests/evidence", { recursive: true });
  await writeFile("tests/evidence/monitor.json", JSON.stringify(report, null, 2));
  console.log(`${probes.length} probes, ${report.failedProbes} failed; tests/evidence/monitor.json`);
  if (report.failedProbes) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
