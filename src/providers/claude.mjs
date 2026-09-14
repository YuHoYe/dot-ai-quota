import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { quotaWindow } from "../model.mjs";

export function claudeContext() {
  const home = os.homedir();
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
  const configFile = process.env.CLAUDE_CONFIG_DIR
    ? path.join(configDir, ".claude.json")
    : path.join(home, ".claude.json");
  let account;
  try {
    account = JSON.parse(fs.readFileSync(configFile, "utf8")).oauthAccount
      ?.accountUuid;
  } catch {}
  // Without account identity, do not reuse a quota cache across sign-ins.
  const scope = account
    ? createHash("sha256").update(`${configDir}:${account}`).digest("hex")
    : null;
  const executable = process.platform === "win32" ? "claude.exe" : "claude";
  const candidates = process.env.CLAUDE_BIN
    ? [process.env.CLAUDE_BIN]
    : [
        path.join(home, ".local/bin", executable),
        path.join(home, ".claude/local", executable),
        ...String(process.env.PATH || "")
          .split(path.delimiter)
          .filter(Boolean)
          .map((dir) => path.join(dir, executable)),
      ];
  const bin = candidates.find((file) => {
    try {
      fs.accessSync(file, fs.constants.X_OK);
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
  if (!bin) throw new Error("cli_not_found");
  return { bin, scope };
}

export function parseClaude(body, now = new Date()) {
  if (!body?.rate_limits)
    throw new Error(
      body?.rate_limits_available === false
        ? "subscription_required"
        : "no_quota_data",
    );
  const limits = body.rate_limits;
  const windows = [
    ["five_hour", 18000],
    ["seven_day", 604800],
    ["seven_day_opus", 604800],
    ["seven_day_sonnet", 604800],
  ].flatMap(([id, duration]) => {
    const raw = limits[id];
    if (raw == null) return [];
    const window = quotaWindow(id, raw.utilization, raw.resets_at, duration);
    if (!window) throw new Error("unsupported_response");
    return [window];
  });
  for (const [index, raw] of (Array.isArray(limits.limits)
    ? limits.limits
    : []
  ).entries()) {
    if (raw.kind !== "weekly_scoped") continue;
    const window = quotaWindow(
      `weekly_scoped_${index}`,
      raw.percent,
      raw.resets_at,
      604800,
    );
    if (window)
      windows.push({
        ...window,
        label: String(raw.label || raw.model || "Scoped weekly").slice(0, 40),
      });
  }
  if (!windows.length) throw new Error("no_quota_data");
  return {
    id: "claude",
    plan:
      typeof body.subscription_type === "string"
        ? body.subscription_type.slice(0, 40)
        : null,
    windows,
    resetCredits: null,
    fetchedAt: now.toISOString(),
    source: "live",
    status: "live",
    error: null,
  };
}

export function fetchClaude(
  context,
  { spawnImpl = spawn, timeoutMs = 20000 } = {},
) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    for (const key of [
      "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
      "CLAUDECODE",
      "CLAUDE_CODE_ENTRYPOINT",
      "CLAUDE_CODE_SESSION_ID",
      "CLAUDE_CODE_CHILD_SESSION",
      "CLAUDE_PID",
    ])
      delete env[key];
    const child = spawnImpl(
      context.bin,
      [
        "--safe-mode",
        "--no-session-persistence",
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
        "--tools",
        "",
        "--output-format",
        "stream-json",
        "--input-format",
        "stream-json",
        "--verbose",
      ],
      {
        cwd: os.homedir(),
        env,
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    let settled = false,
      buffer = "",
      sentUsage = false;
    const finish = (error, data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdin.end();
      child.kill();
      const force = setTimeout(() => child.kill("SIGKILL"), 500);
      force.unref();
      child.once("close", () => clearTimeout(force));
      if (error) reject(error);
      else resolve(data);
    };
    const timer = setTimeout(
      () => finish(new Error("probe_timeout")),
      timeoutMs,
    );
    const send = (id, subtype) =>
      child.stdin.write(
        `${JSON.stringify({ type: "control_request", request_id: id, request: { subtype } })}\n`,
      );
    child.on("error", () => finish(new Error("probe_failed")));
    child.stdin.on("error", () => finish(new Error("probe_failed")));
    child.on("exit", () => finish(new Error("probe_exited")));
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > 1024 * 1024)
        return finish(new Error("unsupported_response"));
      let end;
      while (!settled && (end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.type !== "control_response" || !message.response) continue;
        const response = message.response;
        if (response.request_id === "init" && !sentUsage) {
          if (response.subtype !== "success")
            return finish(new Error("probe_failed"));
          sentUsage = true;
          send("usage", "get_usage");
        } else if (response.request_id === "usage") {
          try {
            if (response.subtype !== "success") throw new Error("probe_failed");
            finish(null, parseClaude(response.response));
          } catch (error) {
            finish(error);
          }
        }
      }
    });
    send("init", "initialize");
  });
}
