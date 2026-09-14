#!/usr/bin/env node
import { loadConfig, log } from "./config.mjs";
import { collect } from "./collector.mjs";
import { demoSnapshot } from "./model.mjs";
import { canvasPayload } from "./canvas.mjs";
import { dotRequest, pushSnapshot } from "./dot.mjs";
import { createServer } from "./server.mjs";

const [command = "serve", ...args] = process.argv.slice(2);
const demo = args.includes("--demo");
const help = `Dot AI Quota\n\n  npm start                         Local dashboard at http://127.0.0.1:4317\n  npm run demo                      Demo UI; no credentials or network queries\n  npm run check                     Print normalized quota JSON\n  npm run cli -- devices            List your Dot devices\n  npm run cli -- slots SERIAL       List existing content slots\n  npm run push -- --dry-run         Preview Canvas JSON without sending\n  npm run push                      Update configured Dot content slots\n  npm run push -- --refresh-now     Update and immediately refresh the screen\n  npm run watch                     Query + push every configured interval\n\nConfiguration: config.json + .env (see README). Ctrl+C stops serve/watch.\n`;

async function main() {
  if (["help", "--help", "-h"].includes(command))
    return process.stdout.write(help);
  if (
    !["serve", "check", "devices", "slots", "push", "watch"].includes(command)
  )
    throw new Error("Unknown command. Run npm run cli -- help.");
  if (demo && !["serve", "check"].includes(command))
    throw new Error(
      "--demo is only supported by serve and check; it never pushes.",
    );
  const config = demo
    ? {
        language: "en",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        port: 4317,
        intervalMinutes: 30,
        providers: ["claude", "codex"],
        devices: [],
      }
    : loadConfig();
  if (command === "serve") {
    const server = createServer(config, { demo });
    server.on("error", (error) => {
      log("server_failed", { reason: error.code || "listen_failed" });
      process.exitCode = 1;
      server.close();
    });
    server.listen(config.port, "127.0.0.1", () =>
      log("dashboard_ready", { url: `http://127.0.0.1:${config.port}`, demo }),
    );
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => server.close());
    return;
  }
  if (command === "devices")
    return console.log(JSON.stringify(await dotRequest("/devices"), null, 2));
  if (command === "slots") {
    if (!/^[A-Za-z0-9_-]+$/.test(args[0] || ""))
      throw new Error("Usage: npm run cli -- slots SERIAL");
    return console.log(
      JSON.stringify(
        await dotRequest(`/device/${encodeURIComponent(args[0])}/loop/list`),
        null,
        2,
      ),
    );
  }
  const run = async () => {
    const snapshot = demo ? demoSnapshot() : await collect(config);
    if (command === "check") {
      console.log(JSON.stringify(snapshot, null, 2));
      if (snapshot.providers.every((p) => p.status === "unavailable"))
        process.exitCode = 1;
    } else if (args.includes("--dry-run"))
      console.log(
        JSON.stringify(
          canvasPayload(snapshot, config, args.includes("--refresh-now")),
          null,
          2,
        ),
      );
    else {
      const results = await pushSnapshot(snapshot, config, {
        refreshNow: args.includes("--refresh-now"),
      });
      console.log(
        JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
      );
      if (command !== "watch" && results.some((r) => !r.ok))
        process.exitCode = 1;
    }
  };
  if (command !== "watch") return run();
  if (!process.env.DOT_API_KEY || !config.devices.length)
    throw new Error("watch needs DOT_API_KEY and devices in config.json.");
  let stopping = false,
    timer,
    wake;
  const stop = () => {
    stopping = true;
    clearTimeout(timer);
    wake?.();
  };
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, stop);
  while (!stopping) {
    try {
      await run();
    } catch {
      log("watch_cycle_failed", { retryMinutes: config.intervalMinutes });
    }
    if (!stopping)
      await new Promise((resolve) => {
        wake = resolve;
        timer = setTimeout(resolve, config.intervalMinutes * 60_000);
      });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
