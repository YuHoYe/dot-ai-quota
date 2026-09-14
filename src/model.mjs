export function percent(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
export function iso(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function quotaWindow(id, used, reset, seconds) {
  const usedPercent = percent(used);
  if (usedPercent === null) return null;
  return { id, usedPercent, resetsAt: iso(reset), durationSeconds: seconds };
}
export function unavailable(id, error) {
  return {
    id,
    plan: null,
    status: "unavailable",
    source: null,
    fetchedAt: null,
    windows: [],
    resetCredits: null,
    error,
  };
}
export function markFreshness(provider, now = Date.now()) {
  if (!provider.fetchedAt) return provider;
  const old = now - Date.parse(provider.fetchedAt) > 45 * 60_000;
  const resetPassed = provider.windows.some(
    (w) => w.resetsAt && Date.parse(w.resetsAt) <= now,
  );
  return {
    ...provider,
    status:
      old || resetPassed
        ? "stale"
        : provider.source === "cache"
          ? "cached"
          : "live",
  };
}
export function demoSnapshot(now = new Date()) {
  const reset = (hours) =>
    new Date(now.getTime() + hours * 3600_000).toISOString();
  return {
    generatedAt: now.toISOString(),
    demo: true,
    providers: [
      {
        id: "claude",
        plan: "Max",
        source: "demo",
        status: "live",
        fetchedAt: now.toISOString(),
        resetCredits: null,
        error: null,
        windows: [
          quotaWindow("five_hour", 32, reset(2.4), 18000),
          quotaWindow("seven_day", 58, reset(81), 604800),
        ],
      },
      {
        id: "codex",
        plan: "Pro",
        source: "demo",
        status: "live",
        fetchedAt: now.toISOString(),
        resetCredits: 2,
        error: null,
        windows: [
          quotaWindow("five_hour", 18, reset(3.1), 18000),
          quotaWindow("seven_day", 41, reset(110), 604800),
        ],
      },
    ],
  };
}
