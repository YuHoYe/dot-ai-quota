# Dot AI Quota

**把 Claude 和 Codex 订阅额度，放在屏幕上，也放在桌面上。**

一个本地运行的额度看板，复用你已有的 Claude Code / Codex 登录状态，将简洁的额度卡片推送到 [Dot Quote/0](https://dot.mindreset.tech/docs/quote_0)。**无需安装 Vibe Usage，也不需要它的账号、API Key 或后台服务。**

[English](README.md) · **简体中文**

![Dot AI Quota 中文界面：Claude、Codex 额度和 Quote/0 预览](https://img.yeyuhao.uk/dot-ai-quota/v0.1/dashboard-zh-CN.png)

*截图来自实际运行的应用演示模式，数值均为示例。右侧墨水屏为浏览器近似预览，不是实体设备照片。*

## 能做什么

- **本地网页看板**：中英文切换，使用进度、剩余额度、重置时间和数据新鲜度。
- **Claude 订阅额度**：5 小时、每周，以及客户端返回的模型专项额度。
- **Codex 订阅额度**：接口返回的 5 小时／每周窗口、套餐名称、可用重置额度券。
- **Quote/0 推送**：适配黑白墨水屏的 Canvas 卡片，明确指定内容槽位，支持多设备。
- **手动或定时更新**：手动查询、网页自动刷新、前台循环推送，以及可选的 macOS 后台任务。
- **尽量轻**：只用 Node.js 内置模块，无 npm 运行依赖，无数据库，无托管账号，无统计追踪。

这里展示的是**订阅额度**，不是每日 Token 数、API 账单、排行榜或跨账号统计。服务商没有返回的窗口显示未知，不会猜测为“不限”。

## 先看看效果

安装 **Node.js 24.6 或更新版本**，然后执行：

```bash
git clone https://github.com/YuHoYe/dot-ai-quota.git
cd dot-ai-quota
npm run demo
```

打开 **[http://127.0.0.1:4317](http://127.0.0.1:4317)**。演示模式不需要安装依赖、不读取账号凭据、不查询服务商，也不会推送设备。体验后先按 `Ctrl+C` 停止，再用同一个端口启动正式模式。

## 连接自己的账号

1. 安装 **Claude Code** 和／或 **Codex**，通过各自官方客户端登录订阅账号。单独的 API Key 不提供这里的订阅额度。
2. 在项目目录创建本地配置：

   ```bash
   cp config.example.json config.json
   cp .env.example .env
   ```

3. 运行 `npm run check` 检查标准化额度数据，再运行 `npm start` 打开实时看板。没有 Dot 设备也能使用。

默认查询两个服务商。如果只用一个，把 `providers` 改为 `["codex"]` 或 `["claude"]`。将 `language` 设为 `zh-CN` 或 `en`，控制默认网页语言和 Dot 卡片语言；网页右上角按钮只切换网页界面。`timeZone` 使用 IANA 时区，例如 `Asia/Shanghai`、`Europe/London`。

**平台范围**：已在 macOS 实测 Claude、Codex 实时查询。核心使用跨平台 Node API，CI 在 Linux、macOS、Windows 跑测试；Linux／Windows 的实际账号查询尚未人工验证。可选后台安装器仅支持 macOS。macOS 上请从已登录的桌面会话执行，让 Claude Code 能访问自己的凭据。

## 推送到 Dot

1. 在 **Dot App → 更多 → API Key** 或 Dot 网页面板获取密钥，参考[官方说明](https://dot.mindreset.tech/docs/service/open/get_api)。
2. 在 Dot App 内容工坊给设备轮播添加 **Canvas API** 内容。项目只更新已有槽位，不创建槽位。参考[画板 API 文档](https://dot.mindreset.tech/docs/service/open/canvas_api)。
3. 将密钥填写到本地 `.env`：

   ```dotenv
   DOT_API_KEY=your_dot_api_key
   ```

4. 查询设备序列号和画板槽位的 `taskKey`：

   ```bash
   npm run cli -- devices
   npm run cli -- slots YOUR_DEVICE_SERIAL
   ```

5. 将准确的槽位信息填入 `config.json`：

   ```json
   {
     "language": "zh-CN",
     "timeZone": "Asia/Shanghai",
     "port": 4317,
     "intervalMinutes": 30,
     "providers": ["claude", "codex"],
     "devices": [
       { "name": "书桌", "serial": "YOUR_DEVICE_SERIAL", "taskKey": "YOUR_CANVAS_TASK_KEY" }
     ]
   }
   ```

6. 先查看生成的画板数据，再推送：

   ```bash
   npm run push -- --dry-run
   npm run push
   ```

配置完成并重启网页服务后，**推送到 Dot** 按钮即可使用。`devices` 可添加多个目标，每个目标显示相同卡片；同一槽位不要重复登记，也不要让其他脚本同时接管。

默认只更新内容，等待设备正常轮播。要立即切换屏幕，执行 `npm run push -- --refresh-now`。API 成功代表 Dot 已接受内容，不等于实体屏已经刷新。

## 命令与定时运行

| 命令 | 用途 |
| --- | --- |
| `npm run demo` | 演示网页，不读取账号、不访问设备 |
| `npm start` | 本地网页，按配置间隔自动刷新额度 |
| `npm run check` | 查询额度，输出标准化 JSON |
| `npm run cli -- devices` | 查询 Dot 设备 |
| `npm run cli -- slots SERIAL` | 查询指定设备已有内容槽位 |
| `npm run push -- --dry-run` | 取数并生成 Canvas 数据，不推送 |
| `npm run push` | 查询并更新已配置的 Dot 槽位 |
| `npm run watch` | 按 `intervalMinutes` 循环查询、推送，直到停止 |
| `npm test` | 测试，不需要账号、凭据或设备 |

**网页自动刷新额度，但不会自动推送。** 自动推送请二选一：`npm run watch` 或下面的 macOS 后台任务，不要给相同槽位同时安装两种调度。

确认手动推送正常后，从 **macOS 已登录桌面的终端**安装可选后台任务：

```bash
node scripts/launchd.mjs install     # 立即推送一次，之后按配置间隔执行
node scripts/launchd.mjs status
node scripts/launchd.mjs uninstall
```

后台任务在用户登录且 Mac 未休眠时运行，使用安装时的 Node 路径和项目目录。移动项目或更换 Node 安装后需重新安装任务。日志在 `~/Library/Logs/dot-ai-quota/push.log`。卸载只移除本项目任务，保留配置、缓存和日志。其他平台可以用自己的进程管理器运行 `npm run watch`。

## 数据从哪里来

```text
Claude Code ── stdio get_usage ───┐
                                 ├── 标准化额度 ── 本地网页
Codex 登录态 ── 用量接口 ─────────┘       │
                                   按账号隔离的缓存
                                         │
                                    Dot Canvas API
```

Claude Code 自己处理登录；查询进程只发送控制请求，不发送模型对话，不开放工具，不保存会话。Codex 读取 `$CODEX_HOME/auth.json`（默认 `~/.codex`）中的现有 OAuth 登录状态，访问 ChatGPT 用量接口。当前只支持官方 ChatGPT 地址，不支持自定义网关或仅保存在系统钥匙串中的 Codex 登录态。

这些是**客户端内部接口**，不是承诺稳定的公开额度 API。服务商更新后，适配器可能需要调整。项目不会刷新 OAuth Token 或修改官方客户端凭据；登录过期请在官方客户端重新登录。

成功结果会标准化后缓存到 `~/.dot-ai-quota/`，按服务商和哈希后的账号／登录标识隔离。无法确认 Claude 账号标识时，禁用其自有缓存回退。查询失败可使用 24 小时以内的缓存并明确标注；数据超过 45 分钟或已越过重置时间，标为**过期**。Codex 登录被拒绝时不使用缓存。所有服务商都过期或不可用时，跳过推送。

网页展示所有受支持的返回窗口。Dot 小屏突出 Claude 5 小时额度和 Codex 每周额度，下方展示另一标准窗口；底栏显示第一个可用的 Claude 专项窗口。缺失值保留为 `--`。

## 隐私与配置

- 直接向服务商查询；只有主动推送时，额度卡片才会发送给 Dot。
- 不扫描会话正文，不上传提示词，不访问 Vibe 服务，不收集分析数据。
- OAuth Token 只留在服务端，不返回浏览器，也不写入额度缓存。Dot 密钥保存在被 Git 忽略的 `.env`。
- 网页仅绑定 `127.0.0.1`，校验 Host／Origin，网页操作需携带每次启动生成的随机令牌。请使用 `127.0.0.1` 地址，不要改成 `localhost`；本项目不用于向局域网或反向代理公开服务。

| 可选环境变量 | 用途 |
| --- | --- |
| `CLAUDE_BIN` | Claude 可执行文件绝对路径 |
| `CLAUDE_CONFIG_DIR` | Claude Code 自定义配置目录 |
| `CODEX_HOME` | 含文件式 `auth.json` 的 Codex 目录 |
| `DOT_QUOTA_CONFIG` | CLI／网页的其他配置文件路径；launchd 使用仓库配置 |
| `DOT_QUOTA_STATE_DIR` | 其他额度缓存目录 |
| `HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` | Node 内置代理；npm 实时命令已启用 `--use-env-proxy` |

`.env` 和 `config.json` 在启动时读取，修改后请重启。请不要把密钥放进截图、Issue 或 PR。

## 常见问题

| 问题 | 检查方向 |
| --- | --- |
| Claude 不可用 | 手动打开 Claude Code，检查订阅登录和 `CLAUDE_BIN`；macOS 需桌面会话 |
| Codex 提示登录 | 官方客户端重新登录，检查 `CODEX_HOME` 和文件式认证 |
| 没有 5 小时额度 | 接口未返回该窗口，显示未知，不推断为不限 |
| 显示缓存／过期 | 检查网络、代理、登录，以及数据获取时间和重置时间 |
| Dot 返回 404 | 核对序列号、已有 Canvas 内容和准确的 `taskKey` |
| Dot 返回 401／403 | 核对 API Key 和设备归属 |
| 推送按钮不可用 | 演示模式、缺少 Dot 密钥或未配置设备；配置后重启 |
| 端口被占用 | 先停止演示／其他实例，或修改 `config.json` 的 `port` |

## 开发与社区

`src/providers/` 负责查询，`src/model.mjs` 定义额度结构，`src/collector.mjs` 管缓存，`src/canvas.mjs` 生成画板；`src/server.mjs` 和 `public/` 提供网页。无需构建步骤。

复现截图：开发环境安装 Playwright（`npm install --no-save playwright`），本机安装 Google Chrome，运行 `npm run demo`，再执行 `node scripts/capture-screenshots.mjs`。脚本拒绝在实时模式截图，并检查语言切换、刷新、演示禁推送和窄屏布局。正常使用不需要 Playwright。

实际验证范围见[验证记录](docs/verification.md)，收录渠道见[社区申请说明](docs/community-submission.md)。项目参考了 Dot 社区轻量自托管工具的形式，是独立社区项目，不属于 Dot、OpenAI、Anthropic 或 Vibe Usage 官方产品。

## 许可证

[MIT](LICENSE) © 2026 YuHoYe。
