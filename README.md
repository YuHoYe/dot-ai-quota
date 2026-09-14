# Dot AI Quota

**Claude and Codex subscription limits, on your screen and your desk.**

A local dashboard that reads your existing Claude Code / Codex sign-ins and sends a compact quota card to [Dot Quote/0](https://dot.mindreset.tech/docs/quote_0). No Vibe Usage installation, account, API key, or backend required.

**English** · [简体中文](README.zh-CN.md)

![Dot AI Quota local dashboard with Claude, Codex and a Quote/0 preview](https://img.yeyuhao.uk/dot-ai-quota/v0.1/dashboard-en.png)

*Screenshot of the running application in demo mode. All numbers are sample data. The embedded e-ink view is a browser approximation, not a photo of a physical device.*

## What you get

- **A local web dashboard** with English / Chinese UI, usage bars, reset times, remaining percentages and data freshness.
- **Claude subscription quota:** five-hour, weekly and model-specific windows when the client exposes them.
- **Codex subscription quota:** five-hour / weekly windows when returned, plan label and available reset-credit count.
- **Quote/0 Canvas output:** readable black-and-white cards, explicit content slots and multiple devices.
- **Refresh on your terms:** on-demand queries, automatic dashboard refresh, a foreground push loop or a macOS launchd job.
- **Small by design:** Node.js built-ins only. No npm runtime dependencies, database, hosted account or telemetry.

This project displays **subscription quota**, not daily token totals, API bills, rankings or cross-account analytics. A missing window is shown as unknown; it is never guessed to mean unlimited.

## Try it first

Install **Node.js 24.6 or newer**, then:

```bash
git clone https://github.com/YuHoYe/dot-ai-quota.git
cd dot-ai-quota
npm run demo
```

Open **[http://127.0.0.1:4317](http://127.0.0.1:4317)**. No dependency installation or credentials are needed for demo mode. Demo mode never queries providers or sends to Dot. Press `Ctrl+C` to stop it before starting live mode on the same port.

## Connect your accounts

1. Install and sign in to **Claude Code** and/or **Codex** using their official clients. Use a subscription-backed sign-in; a standalone API key does not provide these subscription quotas.
2. In the project directory, create your local configuration:

   ```bash
   cp config.example.json config.json
   cp .env.example .env
   ```

3. Run `npm run check` to verify normalized provider data, then `npm start` to open the live dashboard. Both work without a Dot device.

The included config enables both providers. If you use only one, set `"providers": ["codex"]` or `["claude"]`. Set `language` to `en` or `zh-CN` for the default UI and Dot card; the browser language button changes the web UI only. Set `timeZone` to your IANA timezone, such as `Europe/London`, `America/New_York` or `Asia/Shanghai`.

**Platform scope:** live Claude and Codex queries have been tested on macOS. The core uses portable Node APIs, and CI exercises Linux, macOS and Windows, but Linux/Windows live sign-ins are not yet manually verified. The optional background installer is macOS-only. On macOS, run Claude queries from a signed-in desktop session so Claude Code can access its own credentials.

## Send to your Dot

1. Get your API key in **Dot App → More → API Key**, or the Dot web panel. Follow the [official key guide](https://dot.mindreset.tech/docs/service/open/get_api).
2. Add **Canvas API** content to your device’s loop in Dot App Content Studio. This existing content slot is required; the project does not create slots. See the [official Canvas guide](https://dot.mindreset.tech/docs/service/open/canvas_api).
3. Set `DOT_API_KEY` in your local `.env`:

   ```dotenv
   DOT_API_KEY=your_dot_api_key
   ```

4. Discover your device serial and the Canvas slot’s `taskKey`:

   ```bash
   npm run cli -- devices
   npm run cli -- slots YOUR_DEVICE_SERIAL
   ```

5. Add that exact slot to `config.json`. For example:

   ```json
   {
     "language": "en",
     "timeZone": "Europe/London",
     "port": 4317,
     "intervalMinutes": 30,
     "providers": ["claude", "codex"],
     "devices": [
       { "name": "Desk", "serial": "YOUR_DEVICE_SERIAL", "taskKey": "YOUR_CANVAS_TASK_KEY" }
     ]
   }
   ```

6. Preview the payload, then send it:

   ```bash
   npm run push -- --dry-run
   npm run push
   ```

The web dashboard’s **Send to Dot** button becomes available after restarting with this configuration. Each device entry gets the same card; repeat entries only for different slots. Give each slot one owner so another script does not overwrite it.

By default, a push updates the content and lets the device rotate normally. To immediately switch the screen, run `npm run push -- --refresh-now`. An API success means Dot accepted the update; it does not prove a physical screen has already refreshed.

## Commands and scheduling

| Command | What it does |
| --- | --- |
| `npm run demo` | Start the dashboard with sample data; no account/device access |
| `npm start` | Start the local dashboard; automatically refresh quota at the configured interval |
| `npm run check` | Query providers and print normalized JSON |
| `npm run cli -- devices` | List Dot devices |
| `npm run cli -- slots SERIAL` | List a device’s existing content slots |
| `npm run push -- --dry-run` | Query and print a Canvas payload without sending |
| `npm run push` | Query and update configured Dot slots |
| `npm run watch` | Keep querying and pushing at `intervalMinutes` until stopped |
| `npm test` | Run tests; no accounts, credentials or device needed |

**The dashboard refreshes data but does not automatically push.** Choose one automatic push method: `npm run watch`, or the macOS job below. Do not schedule both for the same slots.

After verifying a manual push, install the optional macOS job **from your signed-in desktop terminal**:

```bash
node scripts/launchd.mjs install     # pushes once now, then every configured interval
node scripts/launchd.mjs status
node scripts/launchd.mjs uninstall
```

The job runs while you are logged in and the Mac is awake. It uses the Node executable and project location at installation time; reinstall after moving the project or replacing that Node installation. Logs are in `~/Library/Logs/dot-ai-quota/push.log`. Uninstall removes this project’s job only and keeps your local configuration and cache. On other platforms, use `npm run watch` in your own process manager.

## How it works

```text
Claude Code ── stdio get_usage ─────┐
                                  ├── normalized quota ── local dashboard
Codex sign-in ── usage endpoint ───┘          │
                                     account-scoped cache
                                             │
                                      Dot Canvas API
```

Claude Code handles its own sign-in. The probe sends control requests only, without model prompts, tool access or session persistence. Codex uses its existing OAuth sign-in from `$CODEX_HOME/auth.json` (default `~/.codex`) with the ChatGPT usage endpoint. Only the official ChatGPT origin is supported; custom API gateways and keyring-only Codex sign-ins are not supported by this adapter.

These are **client-internal interfaces**, not a guarantee of stable public quota APIs. Provider updates may require adapter changes. The project does not perform token refresh or modify official client credentials; renew expired sign-ins in the official client.

Successful, normalized snapshots are cached in `~/.dot-ai-quota/`, separated by provider and a hashed account/sign-in scope. If account identity cannot be determined for Claude, its own-cache fallback is disabled. A failed query can show a labeled cached result for up to 24 hours. Data older than 45 minutes, or whose reset boundary has passed, is marked **stale**. A rejected Codex login does not fall back to cached data. Push is skipped when every provider is stale or unavailable.

The web view includes all supported returned windows. The compact Dot card emphasizes Claude’s five-hour window and Codex’s weekly window, shows the other standard window beneath it, and includes the first available Claude scoped window in the footer. Missing values stay `--`.

## Privacy and configuration

- Quota requests go directly to the provider. Only the rendered quota card is sent to Dot when you push.
- The app does not scan conversation transcripts, upload prompts, use Vibe services, or collect analytics.
- OAuth tokens stay server-side and are neither returned to the browser nor written to the quota cache. Dot’s key stays in your ignored `.env` file.
- The server binds to `127.0.0.1`, validates host/origin and requires a per-process nonce for browser actions. Open the `127.0.0.1` URL, not `localhost`; it is not designed for exposure to a LAN or reverse proxy.

| Optional setting | Purpose |
| --- | --- |
| `CLAUDE_BIN` | Absolute path to the Claude executable |
| `CLAUDE_CONFIG_DIR` | Claude Code’s custom configuration directory |
| `CODEX_HOME` | Custom Codex home with file-based `auth.json` |
| `DOT_QUOTA_CONFIG` | Alternate JSON config path for CLI/server (launchd uses repo config) |
| `DOT_QUOTA_STATE_DIR` | Alternate quota cache directory |
| `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` | Node’s built-in proxy support; npm live commands enable `--use-env-proxy` |

The server reads configuration at startup. Restart it after editing `.env` or `config.json`. No secrets belong in screenshots, issues or pull requests.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Claude unavailable | Run Claude Code interactively, check subscription sign-in and `CLAUDE_BIN`; on macOS use a desktop session |
| Codex asks for sign-in | Sign in again in the official client; confirm `CODEX_HOME` and file-based auth |
| A five-hour window is missing | The provider did not return that window; this project displays unknown instead of inferring unlimited |
| Cached / stale badge | Check connection, proxy and login; compare **Last fetched** with the reset time |
| Dot 404 | Verify device serial, existing Canvas content and exact `taskKey` |
| Dot 401 / 403 | Check the Dot API key and device ownership |
| Send button disabled | Demo mode, missing Dot key, or no configured device; restart after configuring |
| Port in use | Stop the demo/other instance or change `port` in `config.json` |

## Development and community

`src/providers/` owns provider adapters; `src/model.mjs` defines quota windows; `src/collector.mjs` owns caching; `src/canvas.mjs` renders the device card; `src/server.mjs` and `public/` provide the dashboard. There is no build step.

For reproducible screenshots, install Playwright as a development-only tool (`npm install --no-save playwright`), have Google Chrome installed, run `npm run demo`, then `node scripts/capture-screenshots.mjs`. The script refuses live mode and checks language switching, refresh, disabled demo sending and narrow layouts. The application itself does not need Playwright.

See [verification notes](docs/verification.md) for what has and has not been tested, and [community submission notes](docs/community-submission.md) for listing channels. Inspired by the Dot community’s small, self-hosted tools; this is an independent project, not an official product of Dot, OpenAI, Anthropic or Vibe Usage.

## License

[MIT](LICENSE) © 2026 YuHoYe.
