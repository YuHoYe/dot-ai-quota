import { markFreshness } from "./model.mjs";

const div = (style, children) => ({ type: "div", props: { style, children } });
const text = (value, style = {}, large = false) => ({
  type: "span",
  props: {
    tw: large ? "text-[24px]-chillduansans font-bold" : "text-pixel-12-zpix",
    style: {
      lineHeight: large ? "26px" : "12px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      ...style,
    },
    children: value,
  },
});
const bar = (value) =>
  div(
    {
      display: "flex",
      height: "6px",
      border: "1px solid black",
      width: "100%",
      boxSizing: "border-box",
      flexShrink: 0,
    },
    [
      div(
        {
          height: "100%",
          width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
          backgroundColor: "black",
        },
        "",
      ),
    ],
  );
function date(value, config, timeOnly = false) {
  if (!value) return "--";
  const options = {
    timeZone: config.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  if (!timeOnly) Object.assign(options, { month: "2-digit", day: "2-digit" });
  return new Intl.DateTimeFormat("en-GB", options)
    .format(new Date(value))
    .replace(",", "");
}

export function canvasPayload(snapshot, config, refreshNow = false) {
  const zh = config.language === "zh-CN";
  const providers = snapshot.providers.map((p) => markFreshness(p));
  const heading = div(
    {
      display: "flex",
      justifyContent: "space-between",
      borderBottom: "1px solid black",
      paddingBottom: "3px",
      flexShrink: 0,
    },
    [
      text(zh ? "AI 额度" : "AI QUOTA"),
      text(
        snapshot.demo
          ? "DEMO"
          : `${zh ? "生成" : "PAGE"} ${date(snapshot.generatedAt, config, true)}`,
      ),
    ],
  );
  const columns = providers.map((provider) => {
    const primaryId = provider.id === "claude" ? "five_hour" : "seven_day";
    const secondaryId = primaryId === "five_hour" ? "seven_day" : "five_hour";
    const primary = provider.windows.find((w) => w.id === primaryId);
    const secondary = provider.windows.find((w) => w.id === secondaryId);
    const label = (id) =>
      id === "five_hour" ? (zh ? "5小时" : "5H") : zh ? "7天" : "7D";
    const pct = (window) =>
      window ? `${Math.round(window.usedPercent)}%` : "--";
    return div(
      {
        display: "flex",
        flexDirection: "column",
        flex: "1",
        minWidth: 0,
        gap: "2px",
      },
      [
        text(provider.id === "claude" ? "CLAUDE" : "CODEX"),
        div({ display: "flex", alignItems: "baseline", gap: "6px" }, [
          text(pct(primary), {}, true),
          text(`${label(primaryId)} ${zh ? "已用" : "used"}`),
        ]),
        bar(primary?.usedPercent),
        text(`${zh ? "重置" : "Reset"} ${date(primary?.resetsAt, config)}`),
        text(`${label(secondaryId)} ${pct(secondary)} ${zh ? "已用" : "used"}`),
        bar(secondary?.usedPercent),
        text(
          `${zh ? "数据" : "As of"} ${date(provider.fetchedAt, config, true)}`,
        ),
      ],
    );
  });
  const stateLabel = {
    live: zh ? "实时" : "LIVE",
    cached: zh ? "缓存" : "CACHE",
    stale: zh ? "过期" : "STALE",
    unavailable: zh ? "未知" : "UNKNOWN",
  };
  const status = snapshot.demo
    ? zh
      ? "演示数据"
      : "DEMO DATA"
    : providers
        .map(
          (p) => `${p.id === "claude" ? "CL" : "CX"} ${stateLabel[p.status]}`,
        )
        .join(" / ");
  const codex = providers.find((p) => p.id === "codex");
  const scoped = providers
    .find((p) => p.id === "claude")
    ?.windows.find(
      (w) =>
        w.id.startsWith("weekly_scoped") ||
        w.id === "seven_day_opus" ||
        w.id === "seven_day_sonnet",
    );
  const bottom = div(
    {
      display: "flex",
      justifyContent: "space-between",
      borderTop: "1px solid black",
      paddingTop: "3px",
      flexShrink: 0,
    },
    [
      text(status),
      ...(scoped
        ? [text(`${zh ? "专项" : "Scope"} ${Math.round(scoped.usedPercent)}%`)]
        : []),
      text(`${zh ? "额度券" : "Credits"} ${codex?.resetCredits ?? "--"}`),
    ],
  );
  return {
    refreshNow,
    taskAlias: "Dot AI Quota",
    data: {},
    border: 0,
    layoutFull: { style: { padding: "6px" } },
    windowData: {
      default: [
        div(
          {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "white",
            color: "black",
            gap: "4px",
          },
          [
            heading,
            div(
              { display: "flex", flex: "1", minHeight: 0, gap: "12px" },
              columns,
            ),
            bottom,
          ],
        ),
      ],
    },
  };
}
