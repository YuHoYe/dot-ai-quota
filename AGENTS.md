# Dot AI Quota

- Keep the application dependency-free (Node.js 24.6+). Source is ESM; tests use `node:test`.
- This is a standalone quota dashboard. Do not require Vibe Usage, scan conversation bodies, or add telemetry.
- Never log OAuth tokens, Dot keys, account identifiers or raw provider responses. Expose normalized quota fields only.
- Missing data is unknown, never unlimited or zero. Keep fetchedAt distinct from render time; cached data is labeled.
- The local server binds to 127.0.0.1; browser mutations need the per-process nonce and same-origin checks.
- Dot writes require explicit configured serial + taskKey. Demo mode must never read credentials or push.
- Keep README.md and README.zh-CN.md equivalent. Screenshots must be from the running app with labeled demo data.
- Before delivery run `npm test`, exercise the demo UI, and review credential leaks, stale/missing data, scheduling, failed API responses and screenshot claims.
- Do not change another repository's device slots or launchd jobs.
