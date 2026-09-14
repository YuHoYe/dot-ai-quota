import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { quotaWindow } from "../model.mjs";

// Read the official client's local sign-in. No token refresh or account mutation.
export function codexContext() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const auth = JSON.parse(
    fs.readFileSync(path.join(home, "auth.json"), "utf8"),
  );
  if (!auth.tokens?.access_token) throw new Error("sign_in_required");
  const scope = createHash("sha256")
    .update(
      `${home}:${auth.tokens.account_id || ""}:${auth.tokens.access_token}`,
    )
    .digest("hex");
  return { auth, scope };
}

export function parseCodex(body, now = new Date()) {
  if (!body?.rate_limit || typeof body.rate_limit !== "object")
    throw new Error("unsupported_response");
  const windows = [];
  for (const key of ["primary_window", "secondary_window"]) {
    const raw = body.rate_limit[key];
    if (raw == null) continue;
    const seconds = raw.limit_window_seconds;
    if (!Number.isFinite(seconds) || seconds <= 0)
      throw new Error("unsupported_response");
    const id =
      seconds === 18000
        ? "five_hour"
        : seconds === 604800
          ? "seven_day"
          : `window_${seconds}`;
    const reset = Number.isFinite(raw.reset_at)
      ? raw.reset_at * 1000
      : Number.isFinite(raw.reset_after_seconds)
        ? now.getTime() + raw.reset_after_seconds * 1000
        : null;
    const window = quotaWindow(id, raw.used_percent, reset, seconds);
    if (!window) throw new Error("unsupported_response");
    windows.push(window);
  }
  if (!windows.length) throw new Error("no_quota_data");
  const count = body.rate_limit_reset_credits?.available_count;
  return {
    id: "codex",
    plan:
      typeof body.plan_type === "string" ? body.plan_type.slice(0, 40) : null,
    windows,
    resetCredits: Number.isInteger(count) && count >= 0 ? count : null,
    fetchedAt: now.toISOString(),
    source: "live",
    status: "live",
    error: null,
  };
}

export async function fetchCodex(context, fetchImpl = fetch) {
  const headers = {
    Authorization: `Bearer ${context.auth.tokens.access_token}`,
    Accept: "application/json",
  };
  if (context.auth.tokens.account_id)
    headers["ChatGPT-Account-Id"] = context.auth.tokens.account_id;
  // Deliberately fixed origin: never forward an OAuth token to a custom provider URL.
  const response = await fetchImpl(
    "https://chatgpt.com/backend-api/wham/usage",
    {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "sign_in_required"
        : `http_${response.status}`,
    );
  return parseCodex(await response.json());
}
