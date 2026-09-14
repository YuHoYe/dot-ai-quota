import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { configPath } from "./config.mjs";

const label = "io.github.yuhoye.dot-ai-quota";
const windowsTask = "Dot AI Quota";
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const unitQuote = (value) =>
  '"' +
  String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("%", "%%")
    .replaceAll("$", "$$") +
  '"';
const windowsQuote = (value) =>
  '"' +
  String(value)
    .replace(/(\\*)"/g, '$1$1\\"')
    .replace(/(\\+)$/g, "$1$1") +
  '"';

export function schedulePlan(
  config,
  {
    platform = process.platform,
    home = os.homedir(),
    node = process.execPath,
    entry = fileURLToPath(new URL("../bin/entry.mjs", import.meta.url)),
    file = configPath(),
    uid = process.getuid?.(),
    user = process.platform === "win32" && process.env.USERDOMAIN
      ? `${process.env.USERDOMAIN}\\${os.userInfo().username}`
      : os.userInfo().username,
    now = new Date(),
  } = {},
) {
  const args = [entry, "push", "--config", file];
  if (platform === "darwin") {
    const logs = path.join(home, "Library/Logs/dot-ai-quota/push.log");
    const target = path.join(home, "Library/LaunchAgents", `${label}.plist`);
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${[node, ...args].map((a) => `<string>${xml(a)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${xml(home)}</string>
<key>EnvironmentVariables</key><dict><key>HOME</key><string>${xml(home)}</string><key>PATH</key><string>${xml(process.env.PATH || "/usr/bin:/bin")}</string></dict>
<key>StartInterval</key><integer>${Math.round(config.intervalMinutes * 60)}</integer>
<key>RunAtLoad</key><false/>
<key>StandardOutPath</key><string>${xml(logs)}</string>
<key>StandardErrorPath</key><string>${xml(logs)}</string>
</dict></plist>`;
    return {
      platform,
      files: [{ path: target, content }],
      logs,
      validate: ["/usr/bin/plutil", ["-lint", target]],
      remove: ["/bin/launchctl", ["bootout", `gui/${uid}/${label}`]],
      install: [["/bin/launchctl", ["bootstrap", `gui/${uid}`, target]]],
      status: ["/bin/launchctl", ["print", `gui/${uid}/${label}`]],
    };
  }
  if (platform === "linux") {
    const directory = path.join(home, ".config/systemd/user");
    const service = `[Unit]\nDescription=Dot AI Quota\n[Service]\nType=oneshot\nExecStart=${[node, ...args].map(unitQuote).join(" ")}\n`;
    const timer = `[Unit]\nDescription=Refresh Dot AI Quota\n[Timer]\nOnActiveSec=${config.intervalMinutes}min\nOnUnitActiveSec=${config.intervalMinutes}min\nUnit=dot-ai-quota.service\n[Install]\nWantedBy=timers.target\n`;
    return {
      platform,
      files: [
        {
          path: path.join(directory, "dot-ai-quota.service"),
          content: service,
        },
        { path: path.join(directory, "dot-ai-quota.timer"), content: timer },
      ],
      remove: [
        "systemctl",
        ["--user", "disable", "--now", "dot-ai-quota.timer"],
      ],
      install: [
        ["systemctl", ["--user", "daemon-reload"]],
        ["systemctl", ["--user", "enable", "--now", "dot-ai-quota.timer"]],
      ],
      status: [
        "systemctl",
        ["--user", "status", "dot-ai-quota.timer", "--no-pager"],
      ],
    };
  }
  if (platform === "win32") {
    const start = new Date(
      now.getTime() + config.intervalMinutes * 60_000,
    ).toISOString();
    const target = path.join(path.dirname(file), "scheduled-task.xml");
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<Triggers><TimeTrigger><Repetition><Interval>PT${Math.round(config.intervalMinutes * 60)}S</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${start}</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
<Principals><Principal id="User"><UserId>${xml(user)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT5M</ExecutionTimeLimit><Enabled>true</Enabled></Settings>
<Actions Context="User"><Exec><Command>${xml(node)}</Command><Arguments>${xml(args.map(windowsQuote).join(" "))}</Arguments><WorkingDirectory>${xml(home)}</WorkingDirectory></Exec></Actions>
</Task>`;
    return {
      platform,
      files: [{ path: target, content }],
      remove: ["schtasks.exe", ["/Delete", "/TN", windowsTask, "/F"]],
      install: [
        ["schtasks.exe", ["/Create", "/TN", windowsTask, "/XML", target, "/F"]],
      ],
      status: [
        "schtasks.exe",
        ["/Query", "/TN", windowsTask, "/V", "/FO", "LIST"],
      ],
    };
  }
  throw new Error(
    "此系统暂不支持自动安装定时任务；可使用 dot-ai-quota watch。",
  );
}

export function manageSchedule(action, config, options = {}) {
  const run =
    options.run ||
    ((command, args) => execFileSync(command, args, { stdio: "pipe" }));
  const plan = schedulePlan(config, options);
  if (action === "status") return String(run(...plan.status));
  if (action === "uninstall") {
    run(...plan.remove);
    for (const file of plan.files) fs.rmSync(file.path, { force: true });
    if (plan.platform === "linux")
      run("systemctl", ["--user", "daemon-reload"]);
    return "已停用定时更新，保留账号配置和缓存。";
  }
  if (action !== "install")
    throw new Error("用法：dot-ai-quota service install|status|uninstall");
  const previous = plan.files.map((file) => ({
    ...file,
    content: fs.existsSync(file.path) ? fs.readFileSync(file.path) : null,
  }));
  let previouslyLoaded = false,
    changedJob = false;
  try {
    run(...plan.status);
    previouslyLoaded = true;
  } catch {}
  try {
    for (const file of plan.files) {
      fs.mkdirSync(path.dirname(file.path), { recursive: true, mode: 0o700 });
      fs.writeFileSync(file.path, file.content, { mode: 0o600 });
    }
    if (plan.logs)
      fs.mkdirSync(path.dirname(plan.logs), { recursive: true, mode: 0o700 });
    if (plan.validate) run(...plan.validate);
    // Only replace this application's existing job, never another scheduler.
    changedJob = true;
    try {
      run(...plan.remove);
    } catch {}
    for (const command of plan.install) run(...command);
    run(...plan.status);
  } catch (error) {
    if (changedJob) {
      try {
        run(...plan.remove);
      } catch {}
    }
    for (const file of previous) {
      if (file.content === null) fs.rmSync(file.path, { force: true });
      else fs.writeFileSync(file.path, file.content, { mode: 0o600 });
    }
    if (
      changedJob &&
      previouslyLoaded &&
      previous.every((file) => file.content !== null)
    ) {
      for (const command of plan.install) {
        try {
          run(...command);
        } catch {}
      }
    }
    throw error;
  }
  return `已启用每 ${config.intervalMinutes} 分钟更新。电脑需保持开机、登录并联网。`;
}
