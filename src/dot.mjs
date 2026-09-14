import { canvasPayload } from "./canvas.mjs";
import { markFreshness } from "./model.mjs";
import { log } from "./config.mjs";

const BASE = "https://dot.mindreset.tech";
export async function dotRequest(
  route,
  {
    key = process.env.DOT_API_KEY,
    method = "GET",
    body,
    fetchImpl = fetch,
  } = {},
) {
  if (!key) throw new Error("DOT_API_KEY is missing. Add it to .env.");
  const response = await fetchImpl(`${BASE}/api/authV2/open${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Dot API HTTP ${response.status}`);
  return response.json();
}

export async function pushSnapshot(
  snapshot,
  config,
  { refreshNow = false, request = dotRequest } = {},
) {
  if (snapshot.demo) throw new Error("Demo mode cannot push to Dot.");
  if (!config.devices.length)
    throw new Error("No Dot slots configured. Add devices to config.json.");
  if (
    !snapshot.providers.some((p) =>
      ["live", "cached"].includes(markFreshness(p).status),
    )
  )
    throw new Error(
      "No recent quota data; push skipped. Refresh provider sign-ins first.",
    );
  const payload = canvasPayload(snapshot, config, refreshNow);
  const results = [];
  for (const [index, device] of config.devices.entries()) {
    try {
      await request(`/device/${encodeURIComponent(device.serial)}/canvas`, {
        method: "POST",
        body: { ...payload, taskKey: device.taskKey },
      });
      results.push({ name: device.name || `Dot ${index + 1}`, ok: true });
      log("dot_content_updated", { target: index + 1, refreshNow });
    } catch (error) {
      const message = /^Dot API HTTP \d{3}$/.test(error.message)
        ? error.message
        : "Dot request failed; check API key and connection.";
      results.push({
        name: device.name || `Dot ${index + 1}`,
        ok: false,
        error: message,
      });
      log("dot_push_failed", { target: index + 1, reason: message });
    }
    // Stay comfortably below the platform's per-second request limit.
    if (index < config.devices.length - 1)
      await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return results;
}
