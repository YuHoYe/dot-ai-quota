import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const stateDir = () =>
  process.env.DOT_QUOTA_STATE_DIR || path.join(os.homedir(), ".dot-ai-quota");
export const configPath = () =>
  path.resolve(
    process.env.DOT_QUOTA_CONFIG || path.join(stateDir(), "config.json"),
  );
export const envPath = () => path.join(path.dirname(configPath()), ".env");

export function loadConfig(file = configPath()) {
  let input = {};
  if (fs.existsSync(file)) input = JSON.parse(fs.readFileSync(file, "utf8"));
  const config = {
    language: "zh-CN",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    port: 4317,
    intervalMinutes: 30,
    providers: ["claude", "codex"],
    devices: [],
    ...input,
  };
  if (!["en", "zh-CN"].includes(config.language))
    throw new Error("language must be en or zh-CN");
  new Intl.DateTimeFormat("en", { timeZone: config.timeZone }).format();
  if (
    !Number.isInteger(config.port) ||
    config.port < 1024 ||
    config.port > 65535
  )
    throw new Error("port must be 1024–65535");
  if (!Number.isFinite(config.intervalMinutes) || config.intervalMinutes < 5)
    throw new Error("intervalMinutes must be at least 5");
  if (
    !Array.isArray(config.providers) ||
    !config.providers.length ||
    new Set(config.providers).size !== config.providers.length ||
    config.providers.some((p) => !["claude", "codex"].includes(p))
  )
    throw new Error(
      "providers must contain claude and/or codex, without duplicates",
    );
  if (!Array.isArray(config.devices))
    throw new Error("devices must be an array");
  const slots = new Set();
  for (const device of config.devices) {
    if (
      typeof device.serial !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(device.serial) ||
      typeof device.taskKey !== "string" ||
      !device.taskKey.trim()
    )
      throw new Error("each device needs serial and taskKey");
    const slot = `${device.serial}:${device.taskKey}`;
    if (slots.has(slot)) throw new Error("duplicate device slot");
    slots.add(slot);
  }
  return config;
}

export function log(event, fields = {}) {
  process.stderr.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`,
  );
}
