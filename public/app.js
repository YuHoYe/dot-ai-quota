const translations = {
  en: {
    local: "On your machine",
    demoNotice:
      "Sample data. Explore the dashboard without connecting an account or device.",
    eyebrow: "A LITTLE CLARITY FOR YOUR WORKDAY",
    title: "Your AI, at a glance.",
    subtitle: "Know what’s left. See when it resets. Keep it on your desk.",
    refresh: "Refresh usage",
    subscriptions: "SUBSCRIPTIONS",
    loading: "Reading your quota…",
    quotaNote:
      "These percentages reflect your subscription limits, not token counts or API spending.",
    deskDisplay: "ON YOUR DESK",
    inkPreview: "E-ink preview",
    previewNote: "Browser preview · device fonts may differ",
    destination: "Destination",
    delivery: "Delivery",
    deliveryValue: "Update content, keep rotation",
    push: "Send to Dot",
    quietTitle: "A quieter way to check.",
    quietBody:
      "Your limits, on a small screen. One less reason to open another tab.",
    privacy: "Local queries. No analytics. No Vibe Usage.",
    five_hour: "5-hour window",
    seven_day: "Weekly window",
    seven_day_opus: "Opus weekly",
    seven_day_sonnet: "Sonnet weekly",
    used: "used",
    left: "left",
    reset: "Resets",
    unknown: "Unknown",
    live: "Live",
    cached: "Cached",
    stale: "Stale",
    unavailable: "Unavailable",
    demo: "Demo",
    source: "Last fetched",
    credits: "reset credits",
    connected: "available",
    notConfigured: "Not configured",
    demoDevice: "Demo preview",
    setup:
      "Add your Dot API key to .env and a Canvas slot to config.json to send this to your device.",
    demoSetup:
      "Sending is disabled in demo mode. Run npm start to connect your own accounts.",
    readySetup:
      "Updates only the slots you configured. Your device keeps its normal content rotation.",
    updated: "Last check",
    refreshing: "Checking…",
    sent: "Dot accepted the content update. It will appear at the next rotation.",
    sending: "Sending…",
    refreshed: "Usage is up to date.",
    throttled: "Checked less than a minute ago. Showing the latest snapshot.",
    sign_in_required: "Sign in again with the official client, then refresh.",
    cli_not_found: "Install Claude Code or set CLAUDE_BIN in .env.",
    subscription_required:
      "A supported Claude subscription is required. API-key sessions do not expose this quota.",
    no_quota_data: "No supported quota windows returned.",
    unsupported_response:
      "The provider response has changed. Check for an adapter update.",
    probe_timeout:
      "Claude Code did not respond in time. Open it in your desktop session and retry.",
    probe_failed:
      "Claude Code could not be queried. Check the CLI and desktop sign-in.",
    probe_exited: "Claude Code exited before returning usage.",
    query_failed:
      "Could not query this provider. Check your connection and sign-in.",
    cacheNote: "Last successful reading. The current query failed.",
  },
  "zh-CN": {
    local: "在本机运行",
    demoNotice: "当前为演示数据，无需连接账号或设备即可体验。",
    eyebrow: "工作日里，少一点惦记",
    title: "AI 额度，一眼就知道。",
    subtitle: "还剩多少，何时重置。放在桌上，随时可见。",
    refresh: "刷新额度",
    subscriptions: "订阅额度",
    loading: "正在读取额度…",
    quotaNote: "这里显示订阅额度的使用比例，不是 Token 数量或 API 消费金额。",
    deskDisplay: "桌面上的一瞥",
    inkPreview: "墨水屏预览",
    previewNote: "浏览器近似预览 · 设备字体可能不同",
    destination: "推送目标",
    delivery: "更新方式",
    deliveryValue: "更新内容，保持正常轮播",
    push: "推送到 Dot",
    quietTitle: "看一眼，接着做。",
    quietBody: "把额度留在小屏幕上，少打开一个浏览器标签页。",
    privacy: "本机查询，无统计追踪，无需 Vibe Usage。",
    five_hour: "5 小时额度",
    seven_day: "每周额度",
    seven_day_opus: "Opus 周额度",
    seven_day_sonnet: "Sonnet 周额度",
    used: "已用",
    left: "剩余",
    reset: "重置",
    unknown: "未知",
    live: "实时",
    cached: "缓存",
    stale: "已过期",
    unavailable: "不可用",
    demo: "演示",
    source: "数据获取于",
    credits: "张重置额度券",
    connected: "个可用",
    notConfigured: "尚未配置",
    demoDevice: "演示预览",
    setup: "在 .env 填写 Dot API Key，在 config.json 添加画板槽位后即可推送。",
    demoSetup: "演示模式不推送。运行 npm start 即可连接自己的账号。",
    readySetup: "仅更新已配置的槽位，设备保持正常的内容轮播。",
    updated: "最近查询",
    refreshing: "查询中…",
    sent: "Dot 已接受内容更新，将在下次轮播时显示。",
    sending: "推送中…",
    refreshed: "额度已更新。",
    throttled: "一分钟内已查询过，当前显示最近一次结果。",
    sign_in_required: "请在官方客户端重新登录后刷新。",
    cli_not_found: "请安装 Claude Code，或在 .env 中设置 CLAUDE_BIN。",
    subscription_required: "需要支持的 Claude 订阅；API Key 会话不提供此额度。",
    no_quota_data: "没有返回支持的额度窗口。",
    unsupported_response: "服务商响应格式有变化，请检查适配器更新。",
    probe_timeout: "Claude Code 查询超时，请在桌面会话中打开后重试。",
    probe_failed: "无法查询 Claude Code，请检查 CLI 和桌面登录状态。",
    probe_exited: "Claude Code 在返回额度前退出。",
    query_failed: "查询失败，请检查连接和登录状态。",
    cacheNote: "显示上次成功获取的数据，本次查询失败。",
  },
};
let state,
  language = localStorage.getItem("quota-language"),
  busy = false;
const t = (key) => translations[language || "en"][key] || key;
const el = (tag, cls, content) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (content != null) node.textContent = content;
  return node;
};
const formatTime = (value, full = false) =>
  value
    ? new Intl.DateTimeFormat(language === "zh-CN" ? "zh-CN" : "en-GB", {
        timeZone: state.timeZone,
        ...(full ? { month: "short", day: "numeric" } : {}),
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(value))
    : "—";
function translatePage() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelector("#language").textContent =
    language === "en" ? "中文" : "English";
}
function makeWindow(window, id) {
  const node = el("div", "quota-window");
  const title = el("div", "window-title");
  title.append(el("span", "", t(id)));
  if (window)
    title.append(
      el(
        "span",
        "remaining",
        `${Math.max(0, Math.round(100 - window.usedPercent))}% ${t("left")}`,
      ),
    );
  const metric = el("div", "metric");
  metric.append(
    el("strong", "", window ? Math.round(window.usedPercent) : "—"),
  );
  if (window) metric.append(el("span", "percent", "%"));
  metric.append(el("span", "used", window ? t("used") : t("unknown")));
  const meter = el("div", "meter");
  const fill = el("div", "meter-fill");
  fill.style.width = `${Math.min(100, window?.usedPercent || 0)}%`;
  meter.append(fill);
  if (window) {
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-label", t(id));
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "100");
    meter.setAttribute(
      "aria-valuenow",
      String(Math.min(100, window.usedPercent)),
    );
  }
  node.append(
    title,
    metric,
    meter,
    el("p", "reset", `${t("reset")} ${formatTime(window?.resetsAt, true)}`),
  );
  return node;
}
function renderProvider(provider) {
  const card = el("article", `provider-card ${provider.id}`);
  const head = el("div", "provider-head");
  head.append(
    el("div", "provider-symbol", provider.id === "claude" ? "✳" : "⌘"),
  );
  const name = el("div");
  name.append(
    el("h3", "provider-name", provider.id === "claude" ? "Claude" : "Codex"),
    el("div", "plan-label", provider.plan || t("unknown")),
  );
  const status = state.snapshot.demo ? "demo" : provider.status;
  head.append(
    name,
    el(
      "span",
      `state-badge ${status === "unavailable" ? "error" : ["stale", "cached"].includes(status) ? "warning" : ""}`,
      t(status),
    ),
  );
  const windows = el("div", "quota-windows");
  for (const id of ["five_hour", "seven_day"])
    windows.append(
      makeWindow(
        provider.windows.find((w) => w.id === id),
        id,
      ),
    );
  card.append(head, windows);
  const extras = provider.windows.filter(
    (w) => !["five_hour", "seven_day"].includes(w.id),
  );
  if (extras.length)
    card.append(
      el(
        "div",
        "extras",
        extras
          .map((w) => `${w.label || t(w.id)} · ${Math.round(w.usedPercent)}%`)
          .join(" / "),
      ),
    );
  if (provider.error)
    card.append(
      el(
        "p",
        "error-note",
        `${provider.source === "cache" ? t("cacheNote") + " " : ""}${translations[language][provider.error] || t("query_failed")}`,
      ),
    );
  const foot = el("div", "provider-foot");
  foot.append(
    el("span", "", `${t("source")} ${formatTime(provider.fetchedAt, true)}`),
  );
  if (provider.resetCredits != null)
    foot.append(
      el("span", "credit", `${provider.resetCredits} ${t("credits")}`),
    );
  else
    foot.append(
      el("span", "", provider.id === "claude" ? "Claude Code" : "Codex"),
    );
  card.append(foot);
  return card;
}
function render() {
  translatePage();
  document.querySelector("#demo-banner").hidden = !state.snapshot.demo;
  document
    .querySelector("#providers")
    .replaceChildren(...state.snapshot.providers.map(renderProvider));
  document.querySelector("#connection-state").textContent =
    `${state.snapshot.providers.filter((p) => p.status !== "unavailable").length} ${t("connected")}`;
  document.querySelector("#destination").textContent = state.snapshot.demo
    ? t("demoDevice")
    : state.devices.map((d) => d.name).join(", ") || t("notConfigured");
  document.querySelector("#setup-note").textContent = t(
    state.snapshot.demo ? "demoSetup" : state.canPush ? "readySetup" : "setup",
  );
  document.querySelector("#push").disabled = !state.canPush || busy;
  document.querySelector("#updated").textContent =
    `${t("updated")} ${formatTime(state.snapshot.generatedAt)} · ${state.timeZone}`;
}
function renderCanvas(element) {
  if (typeof element === "string") return document.createTextNode(element);
  if (!["div", "span"].includes(element.type)) return el("span");
  const node = document.createElement(element.type);
  Object.assign(node.style, element.props.style || {});
  if (element.props.tw?.includes("24px")) {
    node.style.fontSize = "24px";
    node.style.fontWeight = "700";
  }
  const children = Array.isArray(element.props.children)
    ? element.props.children
    : [element.props.children ?? ""];
  node.append(...children.map(renderCanvas));
  return node;
}
async function preview() {
  const response = await fetch("/api/canvas");
  if (!response.ok) throw new Error("Preview unavailable");
  const payload = await response.json();
  document
    .querySelector("#screen")
    .replaceChildren(...payload.windowData.default.map(renderCanvas));
}
async function load() {
  const response = await fetch("/api/status");
  if (!response.ok) throw new Error("Could not load dashboard");
  state = await response.json();
  if (!translations[language]) language = state.language;
  render();
  await preview();
}
let noticeTimer;
function notice(message) {
  const node = document.querySelector("#notice");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    node.hidden = true;
  }, 6500);
}
async function action(route, button) {
  if (busy) return;
  busy = true;
  button.disabled = true;
  try {
    const response = await fetch(`/api/${route}`, {
      method: "POST",
      headers: { "X-Quota-Token": state.token },
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error ||
          result.results
            ?.filter((r) => !r.ok)
            .map((r) => r.error)
            .join("; ") ||
          "Request failed",
      );
    await load();
    notice(
      t(
        route === "push"
          ? "sent"
          : result.throttled
            ? "throttled"
            : "refreshed",
      ),
    );
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
    button.disabled = false;
    if (state) render();
  }
}
document.querySelector("#language").addEventListener("click", () => {
  language = language === "en" ? "zh-CN" : "en";
  localStorage.setItem("quota-language", language);
  if (state) render();
  else translatePage();
});
document
  .querySelector("#refresh")
  .addEventListener("click", (event) => action("refresh", event.currentTarget));
document
  .querySelector("#push")
  .addEventListener("click", (event) => action("push", event.currentTarget));
load().catch((error) => {
  document.querySelector("#providers").textContent = error.message;
  notice(error.message);
});
setInterval(() => {
  if (!busy) load().catch(() => {});
}, 60_000);
