import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { parseEnv } from "node:util";
import {
  setup,
  setupOptions,
  slotsFromResponse,
  writeSetup,
} from "../src/setup.mjs";
import { demoSnapshot } from "../src/model.mjs";
import { canvasPayload } from "../src/canvas.mjs";
import { terminalPrompts } from "../src/prompts.mjs";
import { schedulePlan, manageSchedule } from "../src/scheduler.mjs";

function fixture(t, answers = ["y", ""]) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "dot-setup-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const file = path.join(home, "config.json"),
    printed = [],
    calls = [];
  let sent;
  const dependencies = {
    file,
    environment: { DOT_API_KEY: "fixture-secret" },
    io: {
      say: (line) => printed.push(line),
      ask: async () => answers.shift() ?? "",
      close() {},
    },
    collect: async () => ({ ...demoSnapshot(), demo: false }),
    request: async (route, options) => {
      assert.equal(options.key, "fixture-secret");
      calls.push(route);
      if (route === "/devices")
        return [
          { model: "rand_0", id: "OTHER" },
          { model: "quote_0", id: "TEST", alias: "书桌" },
        ];
      return [
        { type: "TEXT_API", key: "text" },
        {
          type: "CANVAS_API",
          key: "canvas",
          taskAlias: "AI 额度",
          ...(sent ? { windowData: sent } : {}),
        },
      ];
    },
    push: async (snapshot, config, options) => {
      assert.equal(config.devices.length, 1);
      assert.equal(config.language, "zh-CN");
      assert.equal(options.refreshNow, true);
      sent = canvasPayload(snapshot, config, true).windowData;
      return [{ ok: true }];
    },
    schedule: () => {
      calls.push("schedule");
      return "已启用";
    },
  };
  return { home, file, printed, calls, dependencies };
}
test("setup discovers provider/device/Canvas, saves privately, verifies delivery before scheduling", async (t) => {
  const f = fixture(t);
  const result = await setup([], f.dependencies);
  assert.deepEqual(result, { configured: true, stored: true, scheduled: true });
  const config = JSON.parse(fs.readFileSync(f.file));
  assert.equal(config.devices[0].taskKey, "canvas");
  assert.equal(config.language, "zh-CN");
  assert.equal(
    parseEnv(fs.readFileSync(path.join(f.home, ".env"), "utf8")).DOT_API_KEY,
    "fixture-secret",
  );
  if (process.platform !== "win32")
    assert.equal(fs.statSync(path.join(f.home, ".env")).mode & 0o777, 0o600);
  assert.ok(!f.printed.join("\n").includes("fixture-secret"));
  assert.equal(f.calls.at(-1), "schedule");
});
test("cancel before save has no files, no push and no scheduler side effects", async (t) => {
  const f = fixture(t, ["n"]);
  f.dependencies.push = () => assert.fail();
  f.dependencies.schedule = () => assert.fail();
  assert.deepEqual(await setup([], f.dependencies), { cancelled: true });
  assert.equal(fs.existsSync(f.file), false);
});
test("API accepted but wrong stored payload blocks scheduled updates", async (t) => {
  const f = fixture(t, ["y"]);
  const request = f.dependencies.request;
  f.dependencies.push = async () => [{ ok: true }];
  f.dependencies.schedule = () => assert.fail();
  let slots = 0;
  f.dependencies.request = async (route, options) => {
    const result = await request(route, options);
    if (route !== "/devices" && ++slots > 1)
      result[1].windowData = { default: [] };
    return result;
  };
  await assert.rejects(setup([], f.dependencies), /回读内容/);
});
test("failed push preserves retry configuration and never installs a schedule", async (t) => {
  const f = fixture(t, ["y"]);
  f.dependencies.push = async () => [{ ok: false }];
  f.dependencies.schedule = () => assert.fail();
  await assert.rejects(setup([], f.dependencies), /首次推送失败/);
  assert.ok(fs.existsSync(f.file));
});
test("unattended setup refuses ambiguous devices and keeps credentials out of arguments", async (t) => {
  assert.throws(() => setupOptions(["--api-key", "secret"]), /不支持参数/);
  assert.throws(() => setupOptions(["--non-interactive"]), /--yes/);
  const f = fixture(t);
  f.dependencies.request = async () => [
    { model: "quote_0", id: "ONE" },
    { model: "quote_0", id: "TWO" },
  ];
  await assert.rejects(
    setup(["--non-interactive", "--yes"], f.dependencies),
    /--device/,
  );
  assert.ok(!fs.existsSync(f.file));
});
test("unattended setup uses a local secret file and exact explicit targets", async (t) => {
  const f = fixture(t);
  const secret = path.join(f.home, "key");
  fs.writeFileSync(secret, "fixture-secret\n");
  f.dependencies.environment = {};
  const result = await setup(
    [
      "--non-interactive",
      "--yes",
      "--key-file",
      secret,
      "--device",
      "TEST",
      "--slot",
      "canvas",
      "--background",
    ],
    f.dependencies,
  );
  assert.equal(result.scheduled, true);
  assert.ok(!f.printed.join("").includes("fixture-secret"));
});
test("no available login or invalid Dot key does not persist configuration", async (t) => {
  const f = fixture(t);
  f.dependencies.collect = async () => ({
    providers: [{ id: "codex", status: "unavailable" }],
  });
  await assert.rejects(setup([], f.dependencies), /没有可用/);
  assert.ok(!fs.existsSync(f.file));
  f.dependencies.collect = async () => ({ ...demoSnapshot(), demo: false });
  f.dependencies.request = async () => {
    throw new Error("Dot API HTTP 401");
  };
  await assert.rejects(setup([], f.dependencies), /API Key 无效/);
  assert.ok(!fs.existsSync(f.file));
});
test("reconfiguration preserves other targets and proxy settings; absent Canvas is never guessed", async (t) => {
  const f = fixture(t);
  const existing = {
    language: "zh-CN",
    devices: [{ name: "other", serial: "OTHER", taskKey: "other-canvas" }],
  };
  fs.writeFileSync(f.file, JSON.stringify(existing));
  fs.writeFileSync(
    path.join(f.home, ".env"),
    'HTTP_PROXY="http://127.0.0.1:6152"\nDOT_API_KEY=old\nUNRELATED=value\n',
  );
  await setup([], f.dependencies);
  const saved = JSON.parse(fs.readFileSync(f.file));
  assert.equal(saved.devices.length, 2);
  assert.equal(saved.devices[0].serial, "OTHER");
  const environment = parseEnv(
    fs.readFileSync(path.join(f.home, ".env"), "utf8"),
  );
  assert.equal(environment.HTTP_PROXY, "http://127.0.0.1:6152");
  assert.equal(environment.UNRELATED, "value");
  assert.deepEqual(
    slotsFromResponse([
      { type: "TEXT_API", key: "text" },
      { type: "CANVAS_API", key: null },
    ]),
    [],
  );
});
test("env writer preserves Windows paths without interpreting backslashes or newlines", (t) => {
  const f = fixture(t);
  writeSetup({ devices: [] }, "fixture-secret", f.file, {
    CODEX_HOME: "C:\\Users\\Name With Spaces\\.codex",
  });
  assert.equal(
    parseEnv(fs.readFileSync(path.join(f.home, ".env"), "utf8")).CODEX_HOME,
    "C:\\Users\\Name With Spaces\\.codex",
  );
  assert.throws(
    () => writeSetup({}, "key\nLEAK=value", f.file, {}),
    /格式不正确/,
  );
});
test("hidden key input never echoes the pasted secret", async () => {
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => {};
  const output = new PassThrough();
  output.isTTY = true;
  let printed = "";
  output.on("data", (c) => {
    printed += c;
  });
  const io = terminalPrompts(input, output);
  const pending = io.secret("粘贴密钥：");
  input.write("fixture-hidden-secret\r");
  assert.equal(await pending, "fixture-hidden-secret");
  io.close();
  assert.ok(!printed.includes("fixture-hidden-secret"));
  assert.ok(printed.includes("粘贴密钥"));
});
test("scheduler plans use persistent package/config paths, no secret arguments, no immediate duplicate push", () => {
  for (const platform of ["darwin", "linux", "win32"]) {
    const plan = schedulePlan(
      { intervalMinutes: 30 },
      {
        platform,
        home: "/test/home",
        file: "/test/config.json",
        node: "/test/Node Runtime/node",
        entry: "/test/Package/bin/entry.mjs",
        uid: 501,
        user: "ExampleUser",
        now: new Date("2026-09-14T00:00:00Z"),
      },
    );
    const content = plan.files.map((f) => f.content).join("\n");
    assert.ok(content.includes("config.json"));
    assert.ok(!content.includes("DOT_API_KEY"));
    assert.ok(!content.includes("npx"));
    if (platform === "darwin")
      assert.match(content, /<key>RunAtLoad<\/key><false\/>/);
    if (platform === "linux") assert.match(content, /OnActiveSec=30min/);
    if (platform === "win32")
      assert.match(content, /<LogonType>InteractiveToken<\/LogonType>/);
  }
});
test("scheduler installation checks loaded service status; failures are reported", (t) => {
  const f = fixture(t);
  const calls = [];
  const options = {
    platform: "darwin",
    home: f.home,
    uid: 501,
    file: f.file,
    run: (command, args) => {
      calls.push([command, args]);
      return "loaded";
    },
  };
  assert.match(
    manageSchedule("install", { intervalMinutes: 30 }, options),
    /已启用/,
  );
  assert.equal(calls.at(-1)[1][0], "print");
  assert.throws(
    () =>
      manageSchedule(
        "install",
        { intervalMinutes: 30 },
        {
          ...options,
          run: () => {
            throw new Error("unavailable");
          },
        },
      ),
    /unavailable/,
  );
});
test("failed scheduler replacement restores the previous file and loaded job", (t) => {
  const f = fixture(t);
  const options = { platform: "darwin", home: f.home, uid: 501, file: f.file };
  const old = schedulePlan({ intervalMinutes: 30 }, options).files[0];
  fs.mkdirSync(path.dirname(old.path), { recursive: true });
  fs.writeFileSync(old.path, old.content);
  let attempts = 0;
  assert.throws(
    () =>
      manageSchedule(
        "install",
        { intervalMinutes: 15 },
        {
          ...options,
          run: (_command, args) => {
            if (args[0] === "bootstrap" && ++attempts === 1)
              throw new Error("bootstrap failed");
            return "loaded";
          },
        },
      ),
    /bootstrap failed/,
  );
  assert.equal(attempts, 2);
  assert.equal(fs.readFileSync(old.path, "utf8"), old.content);
});
