# Community listing / 社区收录

Verified on 2026-09-14. Dot’s [Community Co-Creation](https://dot.mindreset.tech/docs/service/co_create) lists standalone repositories; it does not require a special plugin bundle. This project is a local Node.js application using the Canvas API.

## Submission routes / 申请渠道

| Route | Use and evidence |
| --- | --- |
| [Official documentation PR](https://github.com/MindReset/dot_web_docs) | Recommended: propose an introduction under `service/co_create/software/`. The official README welcomes documentation PRs and asks for accurate, consistent, multilingual contributions. Acceptance remains the maintainers’ decision. |
| [Documentation issue](https://github.com/MindReset/dot_web_docs/issues/new) | Alternative: propose a listing with repository, screenshot and installation instructions. This is a documentation feedback channel, not a guaranteed listing form. |
| `contact@mindreset.tech` | The official [general contact address](https://dot.mindreset.tech/docs/contact). Suitable for asking about a listing; not a dedicated published submission inbox. |
| [Official Telegram](https://t.me/dot_mindreset) | Community link in the official site footer; useful for asking where to submit, not a documented approval workflow. |
| [Join Content Studio](https://dot.mindreset.tech/submit) | A different route for integrating content sources into Content Studio. A local tool that pushes to existing Canvas slots does not automatically become a subscribable Studio source. |

建议优先走官方文档 PR，避免同时提交重复 Issue、邮件或群消息。社区共创收录需要维护者审核；发布仓库、提交 PR 都不等于已在官网上线。

## Project description / 项目简介

**English:** Dot AI Quota is a local Claude and Codex subscription-quota dashboard with an English/Chinese interface and Quote/0 Canvas output. It reuses official client sign-ins, keeps account-scoped local caches, labels missing/stale data, and updates explicitly configured content slots. It requires Node.js 24.6+ and has no npm runtime dependencies or Vibe Usage dependency.

**中文：** Dot AI Quota 是一个本地运行的 Claude / Codex 订阅额度看板，提供中英文网页和 Quote/0 Canvas 输出。它复用官方客户端登录态，使用按账号隔离的本地缓存，明确标注缺失与过期数据，只更新已配置的内容槽位。需要 Node.js 24.6+，无 npm 运行依赖，也无需 Vibe Usage。

- Repository: https://github.com/YuHoYe/dot-ai-quota
- License: MIT
- English README: https://github.com/YuHoYe/dot-ai-quota/blob/main/README.md
- 中文说明: https://github.com/YuHoYe/dot-ai-quota/blob/main/README.zh-CN.md
- Screenshots: [`images/dashboard-en.png`](images/dashboard-en.png), [`images/dashboard-zh-CN.png`](images/dashboard-zh-CN.png)
- Demo: clone the repository and run `npm run demo`; no account/device required.
- Validation: [verification.md](verification.md).

The screenshots are real captures of the local web app using demo data. They are not physical-device photographs. Existing projects already offer AI quota dashboards; this submission makes no first-of-its-kind claim. Its particular combination is a dependency-free Node runtime, bilingual local UI, Canvas output, explicit multiple slots and visible cache freshness.

## Suggested request / 申请文案

> Hello, I would like to propose Dot AI Quota for the Community Co-Creation software directory. The repository includes English and Chinese READMEs, a no-credentials demo, screenshots of the running application, an MIT license and verification notes. It is a standalone local Claude/Codex quota dashboard with Quote/0 Canvas output and does not require Vibe Usage. The proposed documentation pages summarize the functionality, installation requirements and current validation scope. Please let me know if the entry or screenshot format needs adjustment.

> 你好，想申请将 Dot AI Quota 收录到社区共创的软件目录。项目提供中英文 README、无需账号的演示模式、实际软件截图、MIT 许可证和验证记录。它是独立运行的 Claude／Codex 额度看板，通过 Canvas API 推送 Quote/0，不需要 Vibe Usage。拟提交的文档页说明了功能、安装要求和当前验证范围，如介绍页或截图格式需要调整，我可以配合修改。

Detailed repository comparisons and primary sources: [中文调研记录](community-research.zh-CN.md).
