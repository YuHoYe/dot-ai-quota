#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { loadConfig } from "../src/config.mjs";

if (process.platform !== "darwin") {
  console.error(
    "This installer is for macOS. Use npm run watch on other platforms.",
  );
  process.exit(1);
}
const repo = fileURLToPath(new URL("..", import.meta.url));
const label = "io.github.yuhoye.dot-ai-quota";
const domain = `gui/${process.getuid()}`;
const plist = path.join(os.homedir(), "Library/LaunchAgents", `${label}.plist`);
const command = process.argv[2] || "help";
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const launchctl = (args) =>
  execFileSync("/bin/launchctl", args, { stdio: "inherit" });
function unload() {
  try {
    execFileSync("/bin/launchctl", ["bootout", `${domain}/${label}`], {
      stdio: "ignore",
    });
  } catch {}
}
try {
  if (command === "install") {
    const config = loadConfig(path.join(repo, "config.json"));
    if (!config.devices.length)
      throw new Error(
        "Configure a device slot and test npm run push before installing.",
      );
    if (!fs.existsSync(path.join(repo, ".env")))
      throw new Error("Create .env with DOT_API_KEY first.");
    const logs = path.join(os.homedir(), "Library/Logs/dot-ai-quota");
    fs.mkdirSync(path.dirname(plist), { recursive: true });
    fs.mkdirSync(logs, { recursive: true });
    const argv = [
      process.execPath,
      "--use-env-proxy",
      `--env-file=${path.join(repo, ".env")}`,
      path.join(repo, "src/cli.mjs"),
      "push",
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${argv.map((a) => `<string>${xml(a)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${xml(repo)}</string>
<key>EnvironmentVariables</key><dict><key>HOME</key><string>${xml(os.homedir())}</string><key>DOT_QUOTA_CONFIG</key><string>${xml(path.join(repo, "config.json"))}</string><key>PATH</key><string>${xml(process.env.PATH || "/usr/bin:/bin")}</string></dict>
<key>StartInterval</key><integer>${Math.round(config.intervalMinutes * 60)}</integer>
<key>RunAtLoad</key><true/>
<key>StandardOutPath</key><string>${xml(path.join(logs, "push.log"))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(logs, "push.log"))}</string>
</dict></plist>`;
    fs.writeFileSync(plist, body, { mode: 0o600 });
    execFileSync("/usr/bin/plutil", ["-lint", plist], { stdio: "inherit" });
    unload();
    launchctl(["bootstrap", domain, plist]);
    console.log(
      `Installed; first push runs now, then every ${config.intervalMinutes} minutes. Logs: ${logs}`,
    );
  } else if (command === "uninstall") {
    unload();
    fs.rmSync(plist, { force: true });
    console.log(
      "Removed the Dot AI Quota job. Config, cache and logs retained.",
    );
  } else if (command === "status") launchctl(["print", `${domain}/${label}`]);
  else
    console.log(
      "node scripts/launchd.mjs install | status | uninstall\nRun from a signed-in macOS desktop session. Install starts pushing immediately.",
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
