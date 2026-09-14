#!/usr/bin/env node
import fs from "node:fs";
import { loadConfig, log } from "./config.mjs";
import { collect } from "./collector.mjs";
import { demoSnapshot } from "./model.mjs";
import { canvasPayload } from "./canvas.mjs";
import { dotRequest, pushSnapshot } from "./dot.mjs";
import { createServer } from "./server.mjs";
import { setup, devicesFromResponse, slotsFromResponse } from "./setup.mjs";
import { manageSchedule } from "./scheduler.mjs";

const [command = "setup", ...args] = process.argv.slice(2);
const demo = args.includes("--demo");
const help = `Dot AI Quota

  dot-ai-quota setup                   中文配置向导（默认）
  dot-ai-quota push                    手动更新 Dot
  dot-ai-quota service status          查看定时任务
  dot-ai-quota service uninstall       停止定时更新
  dot-ai-quota service install         安装定时任务
  dot-ai-quota check                   检查账号额度
  dot-ai-quota devices                 列出设备
  dot-ai-quota slots SERIAL            列出画板
  dot-ai-quota watch                   前台循环推送
  dot-ai-quota serve                   可选网页看板
  dot-ai-quota serve --demo            中文演示，不访问账号和设备

配置由向导保存在 ~/.dot-ai-quota/，无需手工编辑文件。
AI 非交互配置：setup --non-interactive --yes --key-file PATH --device SERIAL --slot KEY [--background]
`;

async function main() {
  if (["help", "--help", "-h"].includes(command))
    return process.stdout.write(help);
  if (
    ![
      "setup",
      "service",
      "serve",
      "check",
      "devices",
      "slots",
      "push",
      "watch",
    ].includes(command)
  )
    throw new Error("Unknown command. Run npm run cli -- help.");
  if (demo && !["serve", "check"].includes(command))
    throw new Error(
      "--demo is only supported by serve and check; it never pushes.",
    );
  if (command === "setup") return setup(args);
  const config = demo
    ? {
        language: args.includes("--en") ? "en" : "zh-CN",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        port: 4317,
        intervalMinutes: 30,
        providers: ["claude", "codex"],
        devices: [],
      }
    : loadConfig();
  if (command === "service") {
    if (
      args[0] === "install" &&
      (!config.devices.length || !process.env.DOT_API_KEY)
    )
      throw new Error("请先运行 dot-ai-quota setup 完成配置。");
    console.log(manageSchedule(args[0] || "status", config));
    return;
  }
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
    return console.log(
      JSON.stringify(
        devicesFromResponse(await dotRequest("/devices", readKeyOptions(args))),
        null,
        2,
      ),
    );
  if (command === "slots") {
    if (!/^[A-Za-z0-9_-]+$/.test(args[0] || ""))
      throw new Error("Usage: npm run cli -- slots SERIAL");
    return console.log(
      JSON.stringify(
        slotsFromResponse(
          await dotRequest(
            `/device/${encodeURIComponent(args[0])}/loop/list`,
            readKeyOptions(args),
          ),
        ),
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

function readKeyOptions(args) {
  const index = args.indexOf("--key-file");
  if (index < 0) return {};
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error("--key-file 后需要本机密钥文件路径。");
  const key = fs.readFileSync(args[index + 1], "utf8").trim();
  if (!/^[A-Za-z0-9._~+\/=:-]+$/.test(key))
    throw new Error("密钥文件格式不正确。");
  return { key };
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
