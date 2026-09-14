# Dot AI Quota

**让 Dot 自动显示你的 Claude / Codex 额度。**

运行一次配置向导，之后每半小时自动更新。无需 Vibe Usage，不用手写配置文件，也不用打开网页。

**简体中文** · [English](README.en.md)

![Dot AI Quota 中文墨水屏效果预览](https://img.yeyuhao.uk/dot-ai-quota/v0.2/quote0-zh-CN.png)

*中文画板效果预览，来自实际运行的软件，使用演示数据；不是实体设备照片。*

## 三步配好

准备好一台 Quote/0，以及已经登录的 Claude Code 或 Codex 订阅账号。电脑需要 [Node.js 24.6+](https://nodejs.org/)。不清楚这些是什么？直接使用下面的 **AI 配置提示词**。

**1. 在 Dot App 添加画板**

在内容工坊添加 **Canvas API** 到设备轮播，建议命名为「AI 额度」。这是需要在 App 里手动完成的一步，工具无法代建。

**2. 复制这一行到终端**（macOS / Linux）

```bash
npm install -g https://github.com/YuHoYe/dot-ai-quota/archive/refs/heads/main.tar.gz && dot-ai-quota setup
```

<details>
<summary>Windows PowerShell 命令</summary>

```powershell
npm.cmd install -g https://github.com/YuHoYe/dot-ai-quota/archive/refs/heads/main.tar.gz
if ($LASTEXITCODE -eq 0) { dot-ai-quota.cmd setup }
```

</details>

**3. 跟着中文提示走**

- 粘贴 Dot API Key（在 **Dot App → 更多 → API Key** 获取，输入不会回显）。
- 选择设备和画板；只有一个时自动选中，不用查序列号或槽位 ID。
- 确认首次推送，再选择开启自动更新。

工具会检测 Claude / Codex 登录状态、保存本机配置、核对画板内容，并安装当前用户的定时任务。配置好了就可以关掉终端，电脑保持开机、登录、联网即可；默认每 30 分钟更新，保持设备正常轮播。

如果没有找到画板，向导会等你在 App 添加后重新检查。如果接口没有返回完整画板内容，会请你确认实体屏，不会只凭 HTTP 成功就宣称上屏完成。

## 不想动手？把这段发给 AI

复制下面整段，交给能操作你电脑或终端的 AI（例如 Codex、Claude Code）。普通网页聊天若不能执行本机命令，只能提供指导。

```text
请帮我在这台电脑安装并配置 Dot AI Quota：
https://github.com/YuHoYe/dot-ai-quota

目标：把我个人 Claude / Codex 的订阅额度自动推送到我的 Dot Quote/0，每 30 分钟更新。无需 Vibe Usage，不需要启动网页。

请先阅读仓库最新的中文 README 和配置说明，检查系统、Node.js 24.6+ 和官方客户端登录状态。能直接完成的安装、配置、验证请帮我做好，不要让我手写 JSON 或查序列号。

Dot API Key 请通过本机隐藏输入或已有的本地密钥文件处理，不要让我把密钥粘贴到聊天里，也不要把它写进命令参数、日志或 Git。需要扫码、密码或账号登录时，让我在官方界面完成。

列出真实的 Dot 设备和 Canvas API 画板，让我按名称选择。如果还没有画板，告诉我在 Dot App 哪一步添加，完成后继续。不要猜设备或槽位，不要覆盖其他工具接管的内容。

优先使用 dot-ai-quota setup。你需要非交互配置时，可以使用 setup --non-interactive --yes，配合 --device、--slot 和 --key-file；这些值必须来自实际查询和本机文件。核验成功后可加 --background 安装定时任务。

首次推送后请检查回读结果，并让我确认实际显示；不要把演示数据或 HTTP 200 当作真机验证。确认配置正确后，安装当前用户的定时更新任务并检查其状态，不要再叠加另一套定时器。

最后简短告诉我：哪些账号可用、配置了哪台设备、自动更新是否启用、还有什么需要我完成，以及如何手动更新和停止自动更新。
```

## 平时只需要这几条命令

| 想做什么 | 命令 |
| --- | --- |
| 重新配置 / 换设备 | `dot-ai-quota setup` |
| 立即更新内容 | `dot-ai-quota push` |
| 立即更新并切到该屏 | `dot-ai-quota push --refresh-now` |
| 查看自动更新状态 | `dot-ai-quota service status` |
| 停止自动更新 | `dot-ai-quota service uninstall` |
| 恢复自动更新 | `dot-ai-quota service install` |

已有其他设备配置会保留；重新配置时，首次测试只推送到本次选择的画板。完整配置和密钥只保存在本机 `~/.dot-ai-quota/`，更新软件不会清空它们。升级可以重新执行安装命令和向导。

## 会显示什么

Claude / Codex 已用额度比例、重置时间，以及接口提供的专项额度和重置额度券。缺失值显示「未知」，缓存和过期数据会明确标注。

这是**订阅额度**，不是 Token 总量、API 账单或排行榜。不扫描对话正文，不上传提示词，不做统计追踪；推送时仅把额度卡片发送给 Dot。

## 可选：在电脑上查看

网页不是配置或推送的前提。想查看更完整的数据时才运行：

```bash
dot-ai-quota serve
```

打开 [http://127.0.0.1:4317](http://127.0.0.1:4317)。免账号体验用 `dot-ai-quota serve --demo`；演示模式不会读取凭据或推送设备。

<details>
<summary>查看中文软件界面</summary>

![可选的中文本地看板](https://img.yeyuhao.uk/dot-ai-quota/v0.2/dashboard-zh-CN.png)

*实际软件截图，使用演示数据。*

</details>

## 支持范围与常见问题

- 自动调度支持 macOS launchd、Linux systemd 用户服务、Windows 任务计划程序。Linux 需要可用的 systemd 用户会话，Windows 任务在用户登录时运行。
- 实时账号查询已在 macOS 验证；Linux / Windows 的真实登录和系统调度仍需对应设备验收，自动测试不等同于真机验证。
- 登录过期：在 Claude Code / Codex 官方客户端重新登录，再运行 `dot-ai-quota setup`。
- 安装提示权限不足：使用用户目录的 Node.js 安装；也可以让上面的 AI 提示词帮你处理。
- 电脑休眠、断网或退出登录时，无法持续更新；失败会保留已保存的配置，不会显示为配置成功。
- 一个画板只交给一个工具更新；不要再为相同目标运行另一套定时推送。

[高级配置与 AI 非交互用法](docs/advanced.md) · [验证记录](docs/verification.md) · [社区申请](docs/community-submission.md)

[MIT](LICENSE) © 2026 YuHoYe。本项目为独立社区工具。
