#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { configPath, envPath } from "../src/config.mjs";

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 24 || (major === 24 && minor < 6)) {
  console.error("请先安装 Node.js 24.6 或更新版本：https://nodejs.org/");
  process.exit(1);
}
const args = process.argv.slice(2);
const index = args.indexOf("--config");
if (index >= 0) {
  if (!args[index + 1] || args[index + 1].startsWith("--")) {
    console.error("--config 后需要配置文件路径。");
    process.exit(1);
  }
  process.env.DOT_QUOTA_CONFIG = path.resolve(args[index + 1]);
  args.splice(index, 2);
}
process.env.DOT_QUOTA_CONFIG = configPath();
const demo = args.includes("--demo");
const child = spawn(
  process.execPath,
  [
    "--use-env-proxy",
    ...(!demo && fs.existsSync(envPath()) ? [`--env-file=${envPath()}`] : []),
    fileURLToPath(new URL("../src/cli.mjs", import.meta.url)),
    ...args,
  ],
  { stdio: "inherit", env: process.env },
);
child.on("error", () => {
  console.error("启动失败，请检查 Node.js 安装。");
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 130 : 1);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
