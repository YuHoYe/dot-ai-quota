# 高级配置与 AI 自动配置

普通用户运行 `dot-ai-quota setup` 即可。本文供维护者、AI 助手和需要自定义的人使用。

## 配置与身份

默认配置目录为 `~/.dot-ai-quota/`：

- `config.json`：语言、时区、刷新间隔、服务商和设备槽位。
- `.env`：Dot API Key，以及查询所需的代理或自定义客户端目录。向导保存时保留其他环境项；文件使用仅本人可读写的权限。
- 按账号隔离的额度缓存：保留数据获取时间，失败时使用有效缓存；超过 45 分钟或越过重置时间标为过期，最多保留 24 小时供回退。

全局安装的软件与这些数据分离，升级不会清空配置。克隆开发也可以用 `npm run setup`，同样默认保存到用户目录。

v0.1 的仓库内配置需要迁移：可直接重新运行向导；或者显式使用 `dot-ai-quota setup --config /绝对路径/config.json`，让它继续管理旧配置和同目录 `.env`。不要让两套定时任务同时接管同一个槽位。

例子（不包含真实密钥）：

```json
{
  "language": "zh-CN",
  "timeZone": "Asia/Shanghai",
  "port": 4317,
  "intervalMinutes": 30,
  "providers": ["claude", "codex"],
  "devices": [
    { "name": "书桌", "serial": "YOUR_SERIAL", "taskKey": "YOUR_CANVAS_KEY" }
  ]
}
```

`language` 支持 `zh-CN` / `en`，控制默认网页和 Dot 卡片语言；浏览器语言按钮只改变网页界面。`intervalMinutes` 最小为 5。修改刷新间隔或移动软件目录后，重新运行 `dot-ai-quota service install`。

可选环境变量：`CLAUDE_BIN`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`、`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`。向导会把当前进程中这些已配置项保存到本机 `.env`，供后台任务复用；已存在的值优先保留。不要使用新配置覆盖别的账号或代理凭据。

`DOT_QUOTA_CONFIG` 或全局参数 `--config PATH` 可指定配置路径；同目录 `.env` 自动读取。`DOT_QUOTA_STATE_DIR` 可指定缓存目录。

## AI 非交互配置

先调用真实列表，不能猜测 ID：

```bash
dot-ai-quota devices
dot-ai-quota slots YOUR_SERIAL
```

这些命令从已有本地 `.env` 或当前进程环境读取 Dot API Key。首次配置还没有保存密钥时，两条命令也支持追加 `--key-file /本机/密钥文件`。首次密钥输入可以通过交互式 `setup` 完成；也可由用户提供仅本机可访问的密钥文件。不要把真实密钥放入参数、聊天或日志。

```bash
dot-ai-quota setup --non-interactive --yes --key-file /本机/密钥文件 --device YOUR_SERIAL --slot YOUR_CANVAS_KEY --background
```

- `--key-file` 文件内容仅为 API Key，支持末尾换行；不是 `.env` 文件。工具不删除源密钥文件。
- 已有本机密钥时可以省略 `--key-file`。
- `--device` / `--slot` 必须匹配实际 API 列表；只有一个候选时可省略，有多个候选时必须明确指定。
- `--yes` 表示同意保存配置并推送到已选中的画板。`--background` 表示核验后安装定时任务；省略它则只配置和推送。
- 不接受 `--api-key` 这类明文密钥参数。
- 没有可用实时额度、API 失败、缺少 Canvas 或回读不一致时，不会安装后台任务。
- API 没返回完整画板内容时，非交互模式会退出，需要在交互向导中确认实体屏。不要改用无条件成功掩盖这一步。

## 调度与日志

- macOS：`io.github.yuhoye.dot-ai-quota`，图形登录会话中的 launchd 任务。日志在 `~/Library/Logs/dot-ai-quota/push.log`。
- Linux：`dot-ai-quota.timer` / `dot-ai-quota.service`，当前用户的 systemd；日志可用 `journalctl --user -u dot-ai-quota.service` 查看。
- Windows：`Dot AI Quota` 任务，使用当前用户的 InteractiveToken，不保存 Windows 密码；状态可用 `dot-ai-quota service status` 查看。

向导完成首次推送后，定时任务从下一个周期开始，不立即重复推送。安装器读取任务状态确认注册成功，但这不代表下一轮已真实执行。电脑需保持开机、登录、联网。

参考：[systemd timer 源码文档](https://github.com/systemd/systemd/blob/main/man/systemd.timer.xml)、[Windows 重复任务](https://learn.microsoft.com/en-us/windows/win32/taskschd/repeating-a-task)。

## 数据口径

Claude 由官方客户端处理登录，通过 `get_usage` 控制请求读取额度，不发送模型对话。Codex 读取文件式 `auth.json` 并访问固定的官方 ChatGPT 用量接口；不支持自定义网关或仅钥匙串保存的 Codex 登录态，也不会自行刷新官方客户端的 OAuth Token。

客户端内部接口可能随版本变化。网页展示全部受支持窗口，Dot 小屏优先展示 Claude 5 小时和 Codex 每周额度，另一个标准窗口放在下方，底栏显示首个专项窗口及额度券。

## 开发

```bash
npm test
npm run demo
npm run dashboard
npm run push -- --dry-run
```

无构建步骤或运行依赖。`npm pack` 可生成安装包；全局安装入口为 `bin/entry.mjs`。截图脚本需要开发环境的 Playwright 和 Google Chrome，运行方式见脚本开头。公开 README 截图使用图床地址，仓库保留原图便于复现。
