// Development only: npm install --no-save playwright, then npm run demo.
// Uses installed Chrome; set PLAYWRIGHT_MODULE for an existing Playwright install.
import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const url = "http://127.0.0.1:4317";
const status = await (await fetch(`${url}/api/status`)).json();
assert.equal(
  status.snapshot.demo,
  true,
  "Only capture public screenshots from demo mode.",
);
const output = fileURLToPath(new URL("../docs/images/", import.meta.url));
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator(".provider-card").first().waitFor();
  await page.waitForFunction(
    () => document.querySelector("#screen").children.length > 0,
  );
  assert.equal(await page.locator("#push").isDisabled(), true);
  assert.equal(await page.locator(".provider-card").count(), 2);
  await page.screenshot({ path: `${output}dashboard-en.png`, fullPage: true });
  await page.locator("#refresh").click();
  await page.locator("#notice").waitFor({ state: "visible" });
  await page.locator("#language").click();
  await page.waitForFunction(() => document.documentElement.lang === "zh-CN");
  await page.locator("#notice").waitFor({ state: "hidden" });
  await page.screenshot({
    path: `${output}dashboard-zh-CN.png`,
    fullPage: true,
  });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `No horizontal overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${output}dashboard-mobile.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "UI verified: English/Chinese, refresh, disabled demo push, 390/768px layouts, no browser errors.",
  );
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
