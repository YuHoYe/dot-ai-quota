import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { loadConfig, configPath, log } from "./config.mjs";
import { collect } from "./collector.mjs";
import { dotRequest, pushSnapshot } from "./dot.mjs";
import { canvasPayload } from "./canvas.mjs";
import { manageSchedule } from "./scheduler.mjs";
import { terminalPrompts } from "./prompts.mjs";

const clean = (value) =>
  String(value || "")
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
    .slice(0, 80);
export function setupOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (["--non-interactive", "--yes", "--background"].includes(flag))
      options[flag.slice(2)] = true;
    else if (["--key-file", "--device", "--slot"].includes(flag)) {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error(`${flag} 后需要一个值。`);
      options[flag.slice(2)] = args[++i];
    } else
      throw new Error(
        `setup 不支持参数 ${clean(flag)}；密钥请使用隐藏输入、已有 .env 或 --key-file，不要放在命令参数里。`,
      );
  }
  if (options["non-interactive"] && !options.yes)
    throw new Error("非交互配置需加 --yes，表示同意保存配置并向指定画板推送。");
  return options;
}

export function devicesFromResponse(body) {
  if (!Array.isArray(body))
    throw new Error("Dot 设备列表格式有变化，请更新工具后重试。");
  return body
    .filter(
      (d) =>
        d?.model === "quote_0" &&
        typeof d.id === "string" &&
        /^[\w-]+$/.test(d.id),
    )
    .map((d) => ({
      serial: d.id,
      name: clean(d.alias) || `Quote/0 · ${d.id.slice(-4)}`,
    }));
}
export function slotsFromResponse(body) {
  if (!Array.isArray(body))
    throw new Error("Dot 画板列表格式有变化，请更新工具后重试。");
  return body
    .filter(
      (s) =>
        s?.type === "CANVAS_API" && typeof s.key === "string" && s.key.trim(),
    )
    .map((s) => ({
      taskKey: s.key,
      name: clean(s.taskAlias) || `Canvas API · ${s.key.slice(-6)}`,
    }));
}

async function choose(io, title, items, property, selected, unattended) {
  if (selected) {
    const item = items.find((item) => item[property] === selected);
    if (!item)
      throw new Error(
        `${title}中没有找到指定目标，请先用 devices / slots 命令读取真实列表。`,
      );
    return item;
  }
  if (items.length === 1) {
    io.say(`${title}：${items[0].name}`);
    return items[0];
  }
  if (unattended)
    throw new Error(
      `发现多个${title}，请明确指定 ${property === "serial" ? "--device" : "--slot"}。`,
    );
  io.say(`\n${title}：`);
  items.forEach((item, index) => io.say(`  ${index + 1}. ${item.name}`));
  for (;;) {
    const answer = (await io.ask("输入序号：")).trim();
    const index = Number(answer) - 1;
    if (/^\d+$/.test(answer) && items[index]) return items[index];
    io.say("请输入列表中的序号。");
  }
}

export function writeSetup(config, key, file, environment = process.env) {
  if (!/^[A-Za-z0-9._~+\/=:-]+$/.test(key))
    throw new Error("API Key 格式不正确，请重新粘贴完整密钥。");
  const directory = path.dirname(file),
    envFile = path.join(directory, ".env");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  let lines = fs.existsSync(envFile)
    ? fs.readFileSync(envFile, "utf8").split(/\r?\n/)
    : [];
  lines = lines.filter(
    (line) => !/^\s*(?:export\s+)?DOT_API_KEY\s*=/.test(line),
  );
  // Preserve other settings, including proxies needed by the scheduled process.
  const keys = [
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "NO_PROXY",
    "CLAUDE_BIN",
    "CLAUDE_CONFIG_DIR",
    "CODEX_HOME",
  ];
  for (const name of keys) {
    const value = environment[name];
    if (
      !value ||
      lines.some((line) =>
        new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line),
      )
    )
      continue;
    if (/[\r\n]/.test(value) || (value.includes('"') && value.includes("'")))
      throw new Error(`${name} 含不支持的特殊字符，请先在本机配置文件中设置。`);
    const quote = value.includes('"') ? "'" : '"';
    lines.push(`${name}=${quote}${value}${quote}`);
  }
  lines.push(`DOT_API_KEY=${key}`);
  for (const [target, content] of [
    [envFile, lines.filter(Boolean).join("\n") + "\n"],
    [file, JSON.stringify(config, null, 2) + "\n"],
  ]) {
    const temp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temp, content, { mode: 0o600 });
    fs.renameSync(temp, target);
  }
}

export async function verifyStored(snapshot, config, target, request) {
  const body = await request(
    `/device/${encodeURIComponent(target.serial)}/loop/list`,
  );
  const slot = Array.isArray(body)
    ? body.find((s) => s.type === "CANVAS_API" && s.key === target.taskKey)
    : null;
  if (!slot)
    throw new Error(
      "推送后没有读到目标画板，未开启定时更新。请检查设备和槽位。",
    );
  if (!slot.windowData) return false;
  if (
    !isDeepStrictEqual(
      slot.windowData,
      canvasPayload(snapshot, config, true).windowData,
    )
  )
    throw new Error(
      "画板回读内容与本次推送不一致，可能有其他工具覆盖，未开启定时更新。",
    );
  return true;
}

export async function setup(args = [], dependencies = {}) {
  const options = setupOptions(args),
    unattended = !!options["non-interactive"];
  const io =
    dependencies.io ||
    (unattended ? { say: console.log, close() {} } : terminalPrompts());
  const file = dependencies.file || configPath();
  const collectData = dependencies.collect || collect;
  const request = dependencies.request || dotRequest;
  const push = dependencies.push || pushSnapshot;
  const schedule =
    dependencies.schedule ||
    ((config) => manageSchedule("install", config, { file }));
  const environment = dependencies.environment || process.env;
  try {
    io.say("\nDot AI Quota · 配好后，每半小时自动更新到你的 Dot。\n");
    const previous = loadConfig(file);
    io.say("① 正在检测 Claude / Codex 登录状态…");
    const snapshot = await collectData({
      ...previous,
      providers: ["claude", "codex"],
    });
    const available = snapshot.providers.filter((p) => p.status === "live");
    for (const p of snapshot.providers)
      io.say(
        `  ${p.id === "claude" ? "Claude" : "Codex"}：${p.status === "live" ? "已连接" : "暂不可用（请检查官方客户端登录）"}`,
      );
    if (!available.length)
      throw new Error(
        "没有可用的实时额度。请先在 Claude Code 或 Codex 官方客户端登录订阅账号，再运行 dot-ai-quota setup。",
      );
    let key = environment.DOT_API_KEY?.trim();
    if (options["key-file"])
      key = fs.readFileSync(options["key-file"], "utf8").trim();
    if (!key) {
      if (unattended)
        throw new Error(
          "缺少 Dot API Key。请让用户在本机隐藏输入，或通过 --key-file 读取本机密钥文件；不要让用户在聊天中发送密钥。",
        );
      io.say("\n② 打开 Dot App → 更多 → API Key，创建并复制密钥。");
      key = (await io.secret("粘贴 API Key（输入不会显示）：")).trim();
    } else io.say("\n② 使用本机已提供的 Dot API Key（不显示密钥）。");
    if (!/^[A-Za-z0-9._~+\/=:-]+$/.test(key))
      throw new Error("API Key 格式不正确，请重新复制完整密钥。");
    const api = (route, init = {}) => request(route, { ...init, key });
    const devices = devicesFromResponse(await api("/devices"));
    if (!devices.length)
      throw new Error("此账号下没有找到 Quote/0，请先在 Dot App 配对设备。");
    const device = await choose(
      io,
      "选择设备",
      devices,
      "serial",
      options.device,
      unattended,
    );
    let slots = slotsFromResponse(
      await api(`/device/${encodeURIComponent(device.serial)}/loop/list`),
    );
    while (!slots.length) {
      const instruction =
        "请在 Dot App → 内容工坊中添加 Canvas API 到这台设备的轮播（建议命名为 AI 额度）。";
      if (unattended)
        throw new Error(instruction + " 添加后重试；工具不能替你创建槽位。");
      io.say(instruction);
      await io.ask("添加完成后按回车继续，或 Ctrl+C 退出：");
      slots = slotsFromResponse(
        await api(`/device/${encodeURIComponent(device.serial)}/loop/list`),
      );
    }
    const slot = await choose(
      io,
      "选择画板",
      slots,
      "taskKey",
      options.slot,
      unattended,
    );
    const target = {
      name: device.name,
      serial: device.serial,
      taskKey: slot.taskKey,
    };
    const providers = fs.existsSync(file)
      ? [...new Set([...previous.providers, ...available.map((p) => p.id)])]
      : available.map((p) => p.id);
    const config = {
      ...previous,
      providers,
      devices: [
        ...previous.devices.filter(
          (d) => d.serial !== target.serial || d.taskKey !== target.taskKey,
        ),
        target,
      ],
    };
    // Initial push is limited to the selected slot; existing other targets are preserved.
    const selected = { ...config, devices: [target] };
    const selectedSnapshot = {
      ...snapshot,
      providers: snapshot.providers.filter((p) => providers.includes(p.id)),
    };
    io.say(
      `\n③ 将接管「${device.name} / ${slot.name}」，显示 ${providers.join(" + ")} 额度。其他工具不要同时向此画板推送。`,
    );
    if (
      !options.yes &&
      !/^y(?:es)?$/i.test(
        (await io.ask("保存配置并立即推送一次？[y/N] ")).trim(),
      )
    ) {
      io.say("已取消，没有保存配置或推送。");
      return { cancelled: true };
    }
    writeSetup(config, key, file, environment);
    log("setup_saved", { providers, targets: config.devices.length });
    const results = await push(selectedSnapshot, selected, {
      refreshNow: true,
      request: api,
    });
    if (results.some((r) => !r.ok))
      throw new Error(
        "配置已保存，但首次推送失败，未开启后台任务。检查网络、设备和密钥后，运行 dot-ai-quota setup 重试。",
      );
    const stored = await verifyStored(selectedSnapshot, selected, target, api);
    if (stored)
      io.say("✓ 推送成功，画板内容回读一致。请看一眼实体屏是否已显示。");
    else {
      io.say("Dot 已接受更新，但没有返回完整画板内容，不能自动确认上屏。");
      if (unattended)
        throw new Error(
          "无法自动核验画板内容，未开启定时任务；请在终端运行 setup 并确认实体屏。",
        );
      if (
        !/^y(?:es)?$/i.test(
          (await io.ask("实体屏已经显示 AI 额度了吗？[y/N] ")).trim(),
        )
      )
        throw new Error("配置已保存，等待实体屏确认；未开启定时任务。");
    }
    let background = options.background;
    if (!unattended && background === undefined)
      background = !/^n(?:o)?$/i.test(
        (
          await io.ask(
            `④ 开启每 ${config.intervalMinutes} 分钟自动更新？[Y/n] `,
          )
        ).trim(),
      );
    if (background) {
      try {
        io.say(schedule(config));
        log("setup_schedule_ready", {
          intervalMinutes: config.intervalMinutes,
        });
      } catch {
        throw new Error(
          "额度配置已保存，首次推送已完成，但后台任务安装失败。运行 dot-ai-quota service install 重试；暂时可用 dot-ai-quota watch。",
        );
      }
    } else
      io.say(
        "已配置好。需要时运行 dot-ai-quota push；开启定时更新可运行 dot-ai-quota service install。",
      );
    io.say(`配置保存在 ${file}。不需要打开网页。`);
    return { configured: true, stored, scheduled: !!background };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("已取消配置。");
    if (/^Dot API HTTP (401|403)$/.test(error.message))
      throw new Error("Dot API Key 无效或没有访问权限，请重新复制密钥后重试。");
    throw error;
  } finally {
    io.close();
  }
}
