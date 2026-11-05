import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { renderMediaFixtures } from "./helpers/render-preview-media.mjs";

const preview = await renderMediaFixtures("isolated");
const production = await renderMediaFixtures("standard");
const pages = { form: "form", property: "page", videos: "videos" };
const server = http.createServer((req, res) => {
  const [mode, name] = req.url.split("/").filter(Boolean);
  const body = (mode === "standard" ? production : preview)[pages[name]];
  if (!body) { res.writeHead(204); res.end(); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>' + body + "</body></html>");
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const report = { environment: "actual component SSR with fictitious data on loopback; no external requests permitted", preview: [], productionControl: [], forbiddenRequestsAllowed: 0 };
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  for (const mode of ["isolated", "standard"]) for (const pageName of Object.keys(pages)) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const external = [];
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      external.push(url.hostname);
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin + "/" + mode + "/" + pageName);
    for (const iframe of await page.locator("iframe").all()) await iframe.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(350);
    const row = { page: pageName, iframeElements: await page.locator("iframe").count(),
      videoElements: await page.locator("video").count(), externalRequestAttempts: external.length,
      externalHosts: [...new Set(external)] };
    if (mode === "isolated") {
      report.preview.push(row);
      assert.equal(row.iframeElements, 0);
      assert.equal(row.videoElements, 0);
      assert.equal(external.length, 0, "blocked requests still count as attempted loads");
    } else report.productionControl.push(row);
    await context.close();
  }
  assert.ok(report.productionControl.some(x => x.externalRequestAttempts > 0), "positive control must detect external attempts");
  report.result = "PASS";
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await mkdir("tests/security", { recursive: true });
  await writeFile("tests/security/crm-preview-media-browser-20261105.json", JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
