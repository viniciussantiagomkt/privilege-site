import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const fallback = process.env.CRM_CHROMIUM_PATH;
const args = fallback && process.platform !== "win32"
  ? [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--single-process",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ]
  : [];
const browser = await chromium.launch({
  headless: true,
  ...(fallback ? { executablePath: fallback, args } : { channel: "chromium" }),
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const results = [];
try {
  for (const path of ["/", "/imoveis", "/contato", "/login"]) {
    const response = await page.goto("http://127.0.0.1:3000" + path);
    results.push({
      name: "public route " + path,
      passed: response.status() === 200,
      status: response.status(),
    });
  }
  for (const path of [
    "/admin",
    "/admin/leads",
    "/admin/crm",
    "/admin/corretores",
    "/admin/marketing",
    "/admin/apresentacoes",
    "/admin/automacoes",
    "/admin/empreendimentos",
  ]) {
    await page.goto("http://127.0.0.1:3000" + path);
    await page.waitForURL("**/login");
    results.push({
      name: "anonymous redirects " + path,
      passed: new URL(page.url()).pathname === "/login",
    });
  }
  const response = await page.goto(
    "http://127.0.0.1:3000/apresentacao/synthetic-missing",
  );
  const missing = await page
    .getByText("This page could not be found.")
    .isVisible();
  results.push({
    name: "missing presentation renders not-found",
    passed: missing && [200, 404].includes(response.status()),
    status: response.status(),
  });
  await page.goto("http://127.0.0.1:3000/apresentacoes/invalid");
  results.push({
    name: "invalid presentation token not-found",
    passed: await page.getByText("This page could not be found.").isVisible(),
  });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/", "/imoveis", "/contato", "/login"]) {
    await page.goto("http://127.0.0.1:3000" + path);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    results.push({ name: "mobile without horizontal overflow " + path, passed: noOverflow });
  }
  results.push({
    name: "no browser runtime exceptions",
    passed: errors.length === 0,
    errors,
  });
  await writeFile(
    "tests/crm-browser-results.json",
    JSON.stringify(
      {
        environment: "local connected to staging",
        authentication: "anonymous",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        total: results.length,
        passed: results.filter((x) => x.passed).length,
        failed: results.filter((x) => !x.passed),
      },
      null,
      2,
    ),
  );
  assert.ok(results.every((x) => x.passed));
} finally {
  await browser.close();
}
