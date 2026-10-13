import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const token = process.env.CRM_PUBLIC_FIXTURE_TOKEN;
assert.equal(token, "00000000-0000-4000-8000-000000093013");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CRM_CHROMIUM_PATH,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-zygote",
    "--single-process",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (err) => errors.push(err.message));
  const response = await page.goto(
    `http://127.0.0.1:3000/apresentacoes/${token}`,
    { timeout: 60000 },
  );
  await page
    .getByAltText("Carregando Privilege Imóveis")
    .waitFor({ state: "hidden", timeout: 30000 });
  await page
    .getByRole("heading", { name: "APRESENTAÇÃO FICTÍCIA · HOMOLOGAÇÃO" })
    .waitFor();
  results.push({
    name: "real anonymous token presentation renders",
    passed:
      response.status() === 200 &&
      (await page
        .getByRole("heading", { name: "APRESENTAÇÃO FICTÍCIA · HOMOLOGAÇÃO" })
        .isVisible()),
  });
  results.push({
    name: "desktop no horizontal overflow",
    passed: await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  });
  await page.screenshot({
    path: "/tmp/privilege-presentation-desktop.png",
    fullPage: true,
  });
  const opening = page.waitForResponse((r) =>
    r.url().endsWith("/api/presentation-open"),
  );
  await page
    .getByRole("button", { name: "Autorizar registro da abertura" })
    .click();
  const api = await opening;
  console.log(
    JSON.stringify({ openingStatus: api.status(), body: await api.text() }),
  );
  await page
    .getByText("Abertura registrada. Obrigado!")
    .waitFor({ timeout: 30000 });
  results.push({ name: "real consent API records opening", passed: true });
  await page.setViewportSize({ width: 390, height: 844 });
  results.push({
    name: "mobile no horizontal overflow",
    passed: await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  });
  await page.screenshot({
    path: "/tmp/privilege-presentation-mobile.png",
    fullPage: true,
  });
  results.push({
    name: "no client runtime errors",
    passed: errors.length === 0,
    errors,
  });
  await writeFile(
    "tests/crm-public-presentation-browser-results.json",
    JSON.stringify(
      {
        environment: "local application with real staging RPC",
        authentication: "anonymous",
        fixtures: "synthetic, temporary, removed after test",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed),
    }),
  );
  assert.ok(results.every((r) => r.passed));
} finally {
  await browser.close();
}
