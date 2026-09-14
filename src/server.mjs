import http from "node:http";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { collect } from "./collector.mjs";
import { demoSnapshot, markFreshness } from "./model.mjs";
import { canvasPayload } from "./canvas.mjs";
import { pushSnapshot } from "./dot.mjs";
import { log } from "./config.mjs";

const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
]);

export function createServer(
  config,
  { demo = false, collector = collect, push = pushSnapshot } = {},
) {
  const nonce = randomBytes(24).toString("hex");
  let snapshot = null,
    pending = null,
    lastPush = null,
    pushing = false;
  const refresh = async () => {
    if (pending) return pending;
    pending = Promise.resolve()
      .then(() => (demo ? demoSnapshot() : collector(config)))
      .then((value) => {
        snapshot = value;
        return value;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
  const getSnapshot = async () => {
    if (!snapshot) await refresh();
    return {
      ...snapshot,
      providers: snapshot.providers.map((p) => markFreshness(p)),
    };
  };
  const server = http.createServer(async (req, res) => {
    const port = server.address()?.port;
    const origin = `http://127.0.0.1:${port}`;
    const reply = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    // Host validation also prevents DNS rebinding from a different website.
    if (req.headers.host !== `127.0.0.1:${port}`)
      return reply(403, { error: "Open this app using its 127.0.0.1 URL." });
    if (req.headers.origin && req.headers.origin !== origin)
      return reply(403, { error: "Origin rejected." });
    if (
      req.method === "POST" &&
      (req.headers.origin !== origin || req.headers["x-quota-token"] !== nonce)
    )
      return reply(403, { error: "Reload this page before retrying." });
    const route = new URL(req.url, origin).pathname;
    try {
      if (req.method === "GET" && assets.has(route)) {
        const [file, contentType] = assets.get(route);
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        });
        return res.end(
          fs.readFileSync(
            fileURLToPath(new URL(`../public/${file}`, import.meta.url)),
          ),
        );
      }
      if (req.method === "GET" && route === "/api/status") {
        return reply(200, {
          snapshot: await getSnapshot(),
          token: nonce,
          language: config.language,
          timeZone: config.timeZone,
          intervalMinutes: config.intervalMinutes,
          devices: demo
            ? []
            : config.devices.map((d, i) => ({
                name: d.name || `Dot ${i + 1}`,
              })),
          canPush:
            !demo && !!process.env.DOT_API_KEY && config.devices.length > 0,
          lastPush,
        });
      }
      if (req.method === "GET" && route === "/api/canvas")
        return reply(200, canvasPayload(await getSnapshot(), config));
      if (req.method === "POST" && route === "/api/refresh") {
        if (snapshot && Date.now() - Date.parse(snapshot.generatedAt) < 60_000)
          return reply(200, { snapshot: await getSnapshot(), throttled: true });
        return reply(200, { snapshot: await refresh() });
      }
      if (req.method === "POST" && route === "/api/push") {
        if (demo) return reply(403, { error: "Demo mode cannot push." });
        if (pushing) return reply(409, { error: "A push is already running." });
        if (lastPush && Date.now() - Date.parse(lastPush.at) < 30_000)
          return reply(429, { error: "Wait 30 seconds between pushes." });
        pushing = true;
        try {
          const results = await push(await getSnapshot(), config);
          lastPush = { at: new Date().toISOString(), results };
          return reply(results.every((r) => r.ok) ? 200 : 502, lastPush);
        } finally {
          pushing = false;
        }
      }
      return reply(404, { error: "Not found." });
    } catch (error) {
      log("dashboard_request_failed", { route });
      const known =
        /^(No Dot slots configured\.|No recent quota data;|DOT_API_KEY is missing\.)/.test(
          error.message,
        );
      return reply(500, {
        error: known
          ? error.message
          : "Request failed. Check terminal diagnostics and provider sign-ins.",
      });
    }
  });
  const timer = setInterval(
    () => refresh().catch(() => log("scheduled_refresh_failed")),
    config.intervalMinutes * 60_000,
  );
  timer.unref();
  server.on("close", () => clearInterval(timer));
  return server;
}
