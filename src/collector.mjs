import fs from "node:fs";
import path from "node:path";
import { stateDir, log } from "./config.mjs";
import { unavailable, markFreshness } from "./model.mjs";
import { codexContext, fetchCodex } from "./providers/codex.mjs";
import { claudeContext, fetchClaude } from "./providers/claude.mjs";

const adapters = {
  claude: { context: claudeContext, fetch: fetchClaude },
  codex: { context: codexContext, fetch: fetchCodex },
};
const safeErrors =
  /^(sign_in_required|cli_not_found|subscription_required|no_quota_data|unsupported_response|probe_timeout|probe_failed|probe_exited|http_\d{3})$/;
export const errorCode = (error) =>
  safeErrors.test(error?.message) ? error.message : "query_failed";

export async function collectProvider(
  id,
  adapter = adapters[id],
  cacheDir = stateDir(),
  now = Date.now(),
) {
  let context, cacheFile;
  try {
    context = adapter.context();
    cacheFile = context.scope
      ? path.join(cacheDir, `${id}-${context.scope}.json`)
      : null;
    const provider = await adapter.fetch(context);
    if (cacheFile) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
        const temporary = `${cacheFile}.${process.pid}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(provider), { mode: 0o600 });
        fs.renameSync(temporary, cacheFile);
      } catch {
        log("cache_write_failed", { provider: id });
      }
    }
    log("provider_ready", { provider: id, source: "live" });
    return markFreshness(provider, now);
  } catch (error) {
    const code = errorCode(error);
    // Do not make a revoked login look healthy by using an old cached result.
    if (cacheFile && code !== "sign_in_required") {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
        const age = now - Date.parse(cached.fetchedAt);
        if (
          cached.id === id &&
          Array.isArray(cached.windows) &&
          age >= 0 &&
          age < 24 * 3600_000
        ) {
          log("provider_fallback", {
            provider: id,
            reason: code,
            source: "cache",
          });
          return markFreshness(
            { ...cached, source: "cache", error: code },
            now,
          );
        }
      } catch {}
    }
    log("provider_unavailable", { provider: id, reason: code });
    return unavailable(id, code);
  }
}

export async function collect(config) {
  const providers = await Promise.all(
    config.providers.map((id) => collectProvider(id)),
  );
  return { generatedAt: new Date().toISOString(), demo: false, providers };
}
