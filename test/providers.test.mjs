import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseCodex, fetchCodex } from "../src/providers/codex.mjs";
import { parseClaude, fetchClaude } from "../src/providers/claude.mjs";
import { collectProvider } from "../src/collector.mjs";
import { markFreshness } from "../src/model.mjs";

const now = new Date("2026-09-14T06:00:00Z");
const five = {
  used_percent: 18,
  limit_window_seconds: 18000,
  reset_after_seconds: 600,
};
const week = {
  used_percent: 42,
  limit_window_seconds: 604800,
  reset_at: now.getTime() / 1000 + 6000,
};
test("Codex maps windows by exact duration, never primary/secondary order", () => {
  for (const [a, b] of [
    [five, week],
    [week, five],
  ]) {
    const result = parseCodex(
      {
        rate_limit: { primary_window: a, secondary_window: b },
        rate_limit_reset_credits: { available_count: 2 },
        plan_type: "pro",
      },
      now,
    );
    assert.equal(
      result.windows.find((w) => w.id === "five_hour").usedPercent,
      18,
    );
    assert.equal(
      result.windows.find((w) => w.id === "seven_day").usedPercent,
      42,
    );
    assert.equal(result.resetCredits, 2);
  }
});
test("missing window/credits stays absent, zero is real, future windows keep their duration", () => {
  const result = parseCodex(
    {
      rate_limit: {
        primary_window: { ...week, used_percent: 0 },
        secondary_window: null,
      },
    },
    now,
  );
  assert.equal(result.windows.length, 1);
  assert.equal(result.windows[0].usedPercent, 0);
  assert.equal(result.resetCredits, null);
  assert.equal(
    parseCodex(
      {
        rate_limit: { primary_window: { ...five, limit_window_seconds: 3600 } },
      },
      now,
    ).windows[0].id,
    "window_3600",
  );
});
test("malformed provider fields fail rather than invent zero or unlimited", () => {
  for (const bad of [null, {}, "5", -1, NaN])
    assert.throws(() =>
      parseCodex(
        { rate_limit: { primary_window: { ...five, used_percent: bad } } },
        now,
      ),
    );
  assert.throws(() =>
    parseCodex({ rate_limit: { primary_window: null } }, now),
  );
  assert.throws(() =>
    parseClaude({ rate_limits: { five_hour: { utilization: "0" } } }, now),
  );
});
test("Claude returns standard and named scoped windows, without hardcoded plan or model names", () => {
  const result = parseClaude(
    {
      subscription_type: "max",
      rate_limits: {
        five_hour: { utilization: 32, resets_at: "2026-09-14T10:00:00Z" },
        seven_day: { utilization: 58 },
        limits: [
          { kind: "weekly_scoped", label: "Example model", percent: 10 },
        ],
      },
    },
    now,
  );
  assert.equal(result.windows.length, 3);
  assert.equal(result.windows[2].label, "Example model");
  assert.equal(result.plan, "max");
  assert.throws(
    () => parseClaude({ rate_limits_available: false }, now),
    /subscription_required/,
  );
});
test("Codex sends credentials only to fixed official origin, forbids redirects and strips response identity", async () => {
  let call;
  const result = await fetchCodex(
    {
      auth: {
        tokens: { access_token: "test-secret", account_id: "test-account" },
      },
    },
    async (url, options) => {
      call = { url, options };
      return {
        ok: true,
        json: async () => ({
          email: "private@example.test",
          rate_limit: { primary_window: five },
        }),
      };
    },
  );
  assert.equal(call.url, "https://chatgpt.com/backend-api/wham/usage");
  assert.equal(call.options.redirect, "error");
  assert.equal(call.options.headers["ChatGPT-Account-Id"], "test-account");
  assert.ok(!JSON.stringify(result).includes("private@"));
});
test("Claude stdio probe sends only control requests and consumes a real child process response", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quota-probe-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "probe.mjs");
  fs.writeFileSync(
    file,
    `import readline from 'node:readline';
for await (const line of readline.createInterface({input:process.stdin})) {
 const m=JSON.parse(line);if(m.type!=='control_request')process.exit(3);
 const response=m.request.subtype==='initialize'?{}:{subscription_type:'max',rate_limits:{five_hour:{utilization:12}}};
 console.log(JSON.stringify({type:'control_response',response:{request_id:m.request_id,subtype:'success',response}}));
}`,
  );
  const result = await fetchClaude(
    { bin: "unused" },
    {
      spawnImpl: (_bin, args, options) => {
        assert.ok(args.includes("--no-session-persistence"));
        assert.ok(args.includes("--safe-mode"));
        return spawn(process.execPath, [file], options);
      },
    },
  );
  assert.equal(result.windows[0].usedPercent, 12);
});
test("Claude missing executable and timeout resolve as failures, not uncaught child errors", async () => {
  await assert.rejects(
    fetchClaude({ bin: "/does/not/exist" }),
    /probe_failed|probe_exited/,
  );
  await assert.rejects(
    fetchClaude(
      { bin: "unused" },
      {
        timeoutMs: 50,
        spawnImpl: (_b, _a, options) =>
          spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], options),
      },
    ),
    /probe_timeout/,
  );
});
test("own cache preserves data time, is isolated by account, expires, and is not reused after revoked login", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quota-cache-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const provider = parseCodex({ rate_limit: { primary_window: week } }, now);
  const adapter = {
    context: () => ({ scope: "account-a" }),
    fetch: async () => provider,
  };
  await collectProvider("codex", adapter, dir, now.getTime());
  adapter.fetch = async () => {
    throw new Error("network secret should not appear");
  };
  const cached = await collectProvider(
    "codex",
    adapter,
    dir,
    now.getTime() + 60000,
  );
  assert.equal(cached.source, "cache");
  assert.equal(cached.fetchedAt, now.toISOString());
  assert.equal(cached.error, "query_failed");
  assert.equal(
    (
      await collectProvider(
        "codex",
        adapter,
        dir,
        now.getTime() + 25 * 3600_000,
      )
    ).status,
    "unavailable",
  );
  adapter.context = () => ({ scope: "account-b" });
  assert.equal(
    (await collectProvider("codex", adapter, dir, now.getTime() + 60000))
      .status,
    "unavailable",
  );
  adapter.context = () => ({ scope: "account-a" });
  adapter.fetch = async () => {
    throw new Error("sign_in_required");
  };
  assert.equal(
    (await collectProvider("codex", adapter, dir, now.getTime() + 60000))
      .status,
    "unavailable",
  );
});
test("age and reset boundary both mark previously valid quota stale", () => {
  const provider = parseCodex({ rate_limit: { primary_window: five } }, now);
  assert.equal(
    markFreshness(provider, now.getTime() + 11 * 60000).status,
    "stale",
  );
  assert.equal(
    markFreshness({ ...provider, windows: [] }, now.getTime() + 46 * 60000)
      .status,
    "stale",
  );
});
