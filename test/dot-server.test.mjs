import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { demoSnapshot } from "../src/model.mjs";
import { pushSnapshot, dotRequest } from "../src/dot.mjs";
import { canvasPayload } from "../src/canvas.mjs";
import { createServer } from "../src/server.mjs";

const config = {
  language: "en",
  timeZone: "UTC",
  intervalMinutes: 30,
  providers: ["claude", "codex"],
  devices: [
    { name: "Desk", serial: "TEST01", taskKey: "slot-a" },
    { name: "Studio", serial: "TEST02", taskKey: "slot-b" },
  ],
};
const live = () => ({ ...demoSnapshot(), demo: false });
test("Dot writes only configured slots, keeps rotation, and reports each destination failure", async () => {
  const calls = [];
  const results = await pushSnapshot(live(), config, {
    request: async (route, options) => {
      calls.push({ route, ...options });
      if (route.includes("TEST02")) throw new Error("Dot API HTTP 503");
    },
  });
  assert.deepEqual(
    results.map((r) => r.ok),
    [true, false],
  );
  assert.equal(calls[0].body.taskKey, "slot-a");
  assert.equal(calls[1].body.taskKey, "slot-b");
  assert.equal(calls[0].body.refreshNow, false);
  assert.ok(!JSON.stringify(calls).includes("Bearer"));
});
test("Demo and all-unavailable/all-stale snapshots cannot send", async () => {
  const options = {
    request: async () => {
      assert.fail("Must not contact Dot");
    },
  };
  await assert.rejects(pushSnapshot(demoSnapshot(), config, options), /Demo/);
  const snapshot = live();
  snapshot.providers.forEach((p) => {
    p.fetchedAt = null;
    p.status = "unavailable";
  });
  await assert.rejects(
    pushSnapshot(snapshot, config, options),
    /No recent quota/,
  );
  const stale = live();
  stale.providers.forEach((p) => {
    p.fetchedAt = "2000-01-01T00:00:00Z";
  });
  await assert.rejects(pushSnapshot(stale, config, options), /No recent quota/);
});
test("missing quota and credit counts render as unknown, never unlimited, NaN or zero", () => {
  const snapshot = live();
  snapshot.providers.forEach((p) => {
    p.windows = [];
    p.resetCredits = null;
    p.fetchedAt = null;
    p.status = "unavailable";
  });
  const payload = canvasPayload(snapshot, config);
  const json = JSON.stringify(payload);
  assert.ok(json.includes("UNKNOWN"));
  assert.ok(json.includes("Credits --"));
  assert.ok(!/NaN|unlimited|不限/.test(json));
  function visit(element) {
    assert.ok(["div", "span"].includes(element.type));
    const children = element.props.children;
    if (Array.isArray(children)) children.forEach(visit);
  }
  payload.windowData.default.forEach(visit);
});
test("Dot rejects non-2xx and never follows credential-bearing redirects", async () => {
  await assert.rejects(
    dotRequest("/devices", {
      key: "test-key",
      fetchImpl: async (_url, opts) => {
        assert.equal(opts.redirect, "error");
        return { ok: false, status: 401 };
      },
    }),
    /HTTP 401/,
  );
});

async function start(t, options = { demo: true }) {
  const server = createServer(config, options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}
test("demo server serves real UI and normalized fixtures without calling provider or push", async (t) => {
  const url = await start(t, {
    demo: true,
    collector: () => assert.fail("No real collection"),
    push: () => assert.fail("No pushes"),
  });
  const html = await fetch(url);
  assert.equal(html.status, 200);
  assert.match(
    html.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  const state = await (await fetch(`${url}/api/status`)).json();
  assert.equal(state.snapshot.demo, true);
  assert.equal(state.canPush, false);
  assert.equal(state.devices.length, 0);
  const response = await fetch(`${url}/api/push`, {
    method: "POST",
    headers: { Origin: url, "X-Quota-Token": state.token },
  });
  assert.equal(response.status, 403);
  assert.equal((await fetch(`${url}/api/canvas`)).status, 200);
});
test("local server rejects hostile origins, missing nonces, DNS rebinding hosts, and unknown routes", async (t) => {
  const url = await start(t);
  assert.equal(
    (
      await fetch(`${url}/api/status`, {
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${url}/api/refresh`, {
        method: "POST",
        headers: { Origin: url },
      })
    ).status,
    403,
  );
  const port = Number(new URL(url).port);
  const http = await import("node:http");
  const status = await new Promise((resolve) => {
    http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/api/status",
        headers: { Host: "evil.example" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
  });
  assert.equal(status, 403);
  assert.equal((await fetch(`${url}/secret.env`)).status, 404);
});
test("refresh is single-flight and debounces browser clicks for one minute", async (t) => {
  let calls = 0;
  const url = await start(t, {
    demo: false,
    collector: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      return live();
    },
  });
  await Promise.all([fetch(`${url}/api/status`), fetch(`${url}/api/status`)]);
  assert.equal(calls, 1);
  const state = await (await fetch(`${url}/api/status`)).json();
  const result = await (
    await fetch(`${url}/api/refresh`, {
      method: "POST",
      headers: { Origin: url, "X-Quota-Token": state.token },
    })
  ).json();
  assert.equal(result.throttled, true);
  assert.equal(calls, 1);
});
