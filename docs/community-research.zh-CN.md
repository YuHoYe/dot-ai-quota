# Dot AI 额度插件：社区共创调研

核查日期：2026-09-14。范围为官网、官方文档仓库、四个已收录项目的 README；未安装这些项目，未提交申请、PR、Issue 或消息。

## 结论

社区共创是围绕 Dot 开放 API 的软件、脚本、服务和工作流目录，不要求实现某个统一「插件包」协议。可以用独立开源仓库 + 本地 CLI/服务 + Dot Canvas 推送的形式参加。官网强调可使用、可复用的小工具。[社区说明](https://dot.mindreset.tech/docs/service/co_create)

当前已存在独立 Claude/Codex 额度看板，所以新项目不能声称首个、不依赖 Vibe 的首创。更合适的定位是说明实际实现的区别，例如 Node.js 安装体验、Canvas 排版、多设备、缓存新鲜度、本地预览、登录凭据复用。是否形成足够差异由维护者决定。[现有 Claude/Codex 条目](https://dot.mindreset.tech/docs/service/co_create/software/quote0_token_usage_dash)

## 四个参考项目

| 项目 | 分发/运行形式 | README 和展示惯例 |
|---|---|---|
| [zellux/quote0-token-usage-dash](https://github.com/zellux/quote0-token-usage-dash) | Python，自托管，`uv sync`、`.env.sample`、一次执行/循环执行；本地 Claude/Codex 登录态；Image API | 标题和一句话说明后立即放 `docs/preview.jpg` 实体屏照片；接着展示字段、安装、配置表、认证、API 槽位设置、命令、文件职责。仅英文主 README。 |
| [zzzhizhia/vibe-usage-quote0](https://github.com/zzzhizhia/vibe-usage-quote0) | npm 全局 CLI，`enable` 交互配置，Node.js 20+，Canvas API；依赖 Vibe 账号/API，三平台调度 | Logo + 简介 + 实机照；画板渲染图和 Dot App 预览并列；快速开始、命令表、平台说明、诊断；官网专页概括功能、依赖和安全边界。 |
| [ajaxjiang96/quote0-burnout](https://github.com/ajaxjiang96/quote0-burnout) | Python，自托管，环境变量，单次/循环/launchd/Docker；多个 AI provider；Image/Text API | 中文 README + `README_EN.md`；开头 badges、简介、语言链接、实机照；布局截图表格；配置、预览、自检、FAQ、开发文档。当前仓库已比官网旧介绍支持更多平台，不能用官网旧简介当完整功能表。 |
| [jzjzzzzzzz/dot-studio](https://github.com/jzjzzzzzzz/dot-studio) | Node.js 22.13+ 本地 Web 控制台，克隆、`.env.local`、`npm install`、启动 localhost | 英文主 README；一句话定位后放 `public/og.png`；功能、前置条件、安装、Dot Loop 配置、验证；API Key 放本地服务端。 |

以上结论来自各仓库当前 README；安装命令只作为参考，未执行。对应官网页面：[Vibe Usage](https://dot.mindreset.tech/docs/service/co_create/software/vibe_usage_quote0)、[AI Usage Dashboard](https://dot.mindreset.tech/docs/service/co_create/software/quote0_burnout)、[Dot Studio](https://dot.mindreset.tech/docs/service/co_create/software/dot_studio)。

## README 建议（本项目）

采用 `README.md` 英文 + `README.zh-CN.md` 中文，互相链接。开头放一句话定位和实际软件截图；截图应来自本项目真实预览界面，可使用明示的演示数据，不能冒充实体屏照片。随后：能力范围、前置条件、五分钟安装、Dot Canvas 内容槽位配置、命令、额度/缓存语义、数据流和隐私、刷新/卸载、排障、开发验证、许可证。

把「订阅额度百分比、重置时间」和「Token/美元费用」明确区分，不承诺尚未实现的统计能力。最好支持无凭据 demo 预览，便于潜在用户先看效果。说明支持的平台与已验证平台，不用其他仓库的支持范围为本项目背书。以上为基于对比的建议，不是官方收录强制规范。

## 可以申请/沟通的位置

### 1. 官方文档仓库 PR（推荐）

[MindReset/dot_web_docs](https://github.com/MindReset/dot_web_docs) 的 README 明确欢迎文档改进 PR，要求跟随格式、技术准确、尽可能同步多语言、优化图片。因此新增软件介绍页是具体可审阅的贡献路径；**官方未明确保证新项目 PR 一定被收录，也未发现专门收录审批 SLA**。[贡献说明](https://github.com/MindReset/dot_web_docs#-contributing)

当前目录为：

```text
en-US/service/co_create/software/<slug>.mdx
zh-Hans-CN/service/co_create/software/<slug>.mdx
ja-JP/service/co_create/software/<slug>.mdx
```

现有页采用 frontmatter `title` / `description`、`<GithubInfo owner="..." repo="..." />`、短介绍、Features、Requirements/Good For、必要 Callout。截图可见 `<CustomCloudImage osSrc="dot/docs/...jpg" ... />`；该路径是官方资源存储，不应自行编造。提交仓库内截图链接并请维护者按站点惯例导入，或先用普通 Markdown 图片并让维护者确认。参考：[Vibe 条目源码](https://github.com/MindReset/dot_web_docs/blob/main/en-US/service/co_create/software/vibe_usage_quote0.mdx)。

`software/index.mdx` 使用 `<HrefInlineTOC prefix="/docs/service/co_create/software" />`；`meta.json` 只含 title/defaultOpen，没有手写所有项目清单。因此按当前源码，新页面是主要改动，无须盲目改 index/meta。网站构建代码不在此仓库，尚未验证新增页实际部署行为。[index 源码](https://github.com/MindReset/dot_web_docs/blob/main/en-US/service/co_create/software/index.mdx)、[meta 源码](https://github.com/MindReset/dot_web_docs/blob/main/en-US/service/co_create/software/meta.json)

### 2. 官方文档仓库 Issue

[新建 Issue](https://github.com/MindReset/dot_web_docs/issues/new)。官方 README 明确允许问题和改进建议，可以提交「建议收录：项目名」附仓库、截图、安装步骤、功能边界。它是文档反馈渠道，不是已公布的专用收录表单。[官方 README](https://github.com/MindReset/dot_web_docs)

### 3. 官方邮箱

`contact@mindreset.tech`，官网标注 General Contact & Support，工作时间周一至周五 09:00–18:00。适合把可运行项目和 README 发给官方，请求列入社区共创；这是通用联系渠道，并非特设项目投稿邮箱。[Contact Us](https://dot.mindreset.tech/docs/contact)

### 4. 官方社群

官网页脚提供 X、Telegram、GitHub 社区按钮。站点当前前端资源中对应 X 为 [@dot_mindreset](https://x.com/dot_mindreset)，Telegram 为 [dot_mindreset](https://t.me/dot_mindreset)。可用于询问投稿方式；**没有找到这些社群承诺受理收录或具体管理员的证据**。来源是 [官方联系页](https://dot.mindreset.tech/docs/contact) 的社区按钮和它加载的公开前端链接；未入群或发消息。

### 5. Content Studio 申请表（另一个目标）

[Join Content Studio](https://dot.mindreset.tech/docs/service/studio/join-content-studio) 链接到 [提交表单](https://dot.mindreset.tech/submit)。它用于把内容源接入内容工坊，表单要求分类、交付方式、平台用户规模、说明、邮箱。文档列出 REST/RSS/OAuth/数据文件和图标等素材。**这不是「社区共创 GitHub 项目目录」的同义入口**。本地运行、直接推送 Dot 的插件首选文档 PR/Issue/邮箱；若将来要让用户直接在工坊订阅它，再走该申请。

## 建议准备的申请材料

- 公开仓库地址与开源许可证。
- 中英项目名、各一两句简介、真实功能和前置条件。
- 软件预览截图；有实机照再独立提供并如实标注。
- 可复现安装/配置/预览/推送步骤及验证状态。
- 与现有 Claude/Codex、Vibe 看板的实际区别。
- 维护者联系方式。

这些是便于审阅的建议组合，不是官网统一硬性清单。优先选一个渠道提交，避免并行重复 PR、Issue、邮件。
