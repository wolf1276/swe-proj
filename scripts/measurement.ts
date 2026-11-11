/** Source TC-B01-B03 classify measurements; no synthetic timing is a run. */
export function assessSearch(samples: { ms: number; ok: boolean }[]) {
  return {
    total: samples.length,
    failures: samples.filter(s => !s.ok).length,
    overFiveSeconds: samples.filter(s => s.ms > 5000).length,
    allWithinFiveSeconds: samples.length > 0 && samples.every(s => s.ok && Number.isFinite(s.ms) && s.ms >= 0 && s.ms <= 5000),
  };
}
