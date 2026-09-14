# Dot AI Quota

**Put your Claude / Codex quota on your Dot. Automatically.**

Run the setup wizard once, then let it update your Quote/0 every 30 minutes. No Vibe Usage, hand-written config or running web dashboard required. The setup wizard and default display are in Chinese.

[简体中文](README.md) · **English**

![Chinese Quote/0 card preview](https://img.yeyuhao.uk/dot-ai-quota/v0.2/quote0-zh-CN.png)

*Actual software preview with sample data, not a physical-device photograph.*

## Set up in three steps

You need a Quote/0, a subscription sign-in in Claude Code and/or Codex, and [Node.js 24.6+](https://nodejs.org/). If you prefer help, copy the AI prompt below into an assistant that can operate your computer.

1. In Dot App Content Studio, add **Canvas API** to your device's loop. Give it a recognizable name, such as “AI Quota”. The tool cannot create this slot for you.
2. Run this in your terminal (macOS / Linux):

   ```bash
   npm install -g https://github.com/YuHoYe/dot-ai-quota/archive/refs/heads/main.tar.gz && dot-ai-quota setup
   ```

   Windows PowerShell:

   ```powershell
   npm.cmd install -g https://github.com/YuHoYe/dot-ai-quota/archive/refs/heads/main.tar.gz
   if ($LASTEXITCODE -eq 0) { dot-ai-quota.cmd setup }
   ```

3. Follow the Chinese prompts: paste your Dot API key (Dot App → More → API Key; input is hidden), select a device and Canvas slot, confirm the first push, then enable automatic updates. A single device/slot is selected automatically.

The wizard detects working provider sign-ins, saves configuration locally, checks the stored Canvas content and installs a current-user schedule. When the API omits the full stored content, it asks you to check the physical display. It does not treat HTTP success as proof of the screen's appearance.

After setup, you can close the terminal. The computer must remain awake, signed in and online. Normal scheduled pushes preserve the device's rotation.

## Let an AI configure it

Copy this into an assistant with local computer/terminal access, such as Codex or Claude Code. A browser-only chat without local tools can only provide instructions.

```text
Please install and configure Dot AI Quota on this computer:
https://github.com/YuHoYe/dot-ai-quota

My goal is to show my personal Claude/Codex subscription quota on my Dot Quote/0, updated every 30 minutes. Do not require Vibe Usage or a running web dashboard.

Read the latest README and setup documentation first. Check the OS, Node.js 24.6+ and official-client sign-ins. Complete the installation, configuration and verification for me instead of asking me to edit JSON or look up serial numbers.

Handle the Dot API key through hidden local input or an existing local secret file. Do not ask me to paste it into chat or put it in command arguments, logs or Git. Let me complete passwords, scanning and account sign-in in official interfaces.

List real devices and Canvas API slots and let me choose by name. If a slot is missing, explain how to add it in Dot App and continue afterwards. Do not guess identifiers or overwrite content owned by another tool.

Prefer dot-ai-quota setup. For automated setup, use setup --non-interactive --yes with --device, --slot and --key-file, using queried identifiers and a local file. Add --background to install the schedule after verification.

Check the stored content after the first push and ask me to confirm the physical display. Demo data and HTTP 200 are not physical-device acceptance. Once configuration is verified, install the current-user update schedule and read back its status. Do not add a second scheduler for the same target.

Finally summarize available accounts, the selected device, scheduling status, any remaining action, and the commands to refresh manually or stop automatic updates.
```

## Everyday commands

| Action | Command |
| --- | --- |
| Configure again / add another device | `dot-ai-quota setup` |
| Update content now | `dot-ai-quota push` |
| Update and switch the screen immediately | `dot-ai-quota push --refresh-now` |
| Inspect automatic updates | `dot-ai-quota service status` |
| Stop automatic updates | `dot-ai-quota service uninstall` |
| Re-enable automatic updates | `dot-ai-quota service install` |

Existing other targets are preserved. The setup test sends only to the newly selected slot. Configuration and secrets live in `~/.dot-ai-quota/`, outside the installed package, and survive software upgrades. Re-run the install command and setup to upgrade.

## What is displayed

Provider-reported quota percentages, reset times, scoped windows and reset credits where available. Missing values remain unknown, and cached/stale data is labeled. These are subscription limits, not token totals, API bills or rankings.

The app does not read conversation bodies, upload prompts, or collect analytics. Only the quota card is sent to Dot when pushing.

## Optional dashboard

Run `dot-ai-quota serve` and open [http://127.0.0.1:4317](http://127.0.0.1:4317) if you want to inspect more data. It is not required for setup or background delivery. `dot-ai-quota serve --demo` provides a no-credentials, no-device demo.

<details>
<summary>Chinese dashboard screenshot</summary>

![Optional local dashboard with sample data](https://img.yeyuhao.uk/dot-ai-quota/v0.2/dashboard-zh-CN.png)

</details>

## Support and troubleshooting

- Schedulers: macOS launchd, Linux systemd user timers and Windows Task Scheduler. Linux needs an active systemd user session; Windows uses an interactive user token.
- Live provider queries were verified on macOS. Linux/Windows live sign-in and OS scheduler acceptance still require device-specific validation; automated tests alone do not establish this.
- Expired sign-in: sign in again in the official client, then run `dot-ai-quota setup`.
- Installation permission errors: use a user-owned Node installation, or ask your assistant to help with the prompt above.
- Updates cannot continue while the computer sleeps, is offline or signed out. A failed setup retains configuration for retry and does not claim successful completion.
- Keep one content owner and one schedule per slot.

[Advanced configuration and automation](docs/advanced.md) (Chinese) · [Verification](docs/verification.md) · [Community listing](docs/community-submission.md)

[MIT](LICENSE) © 2026 YuHoYe. An independent community project.
