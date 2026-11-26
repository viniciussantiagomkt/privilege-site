import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = "http://127.0.0.1:3210";
const browser = await chromium.launch({ channel: "msedge", headless: true });
// No routing, API mocks, storage injection or CORS overrides: exercise manual-browser rules.
const context = await browser.newContext();
const page = await context.newPage();
const failures = [], responses = [], checks = [], warnings = [];
let rejectingPassword = false;
page.on("requestfailed", r => failures.push({ url: r.url(), reason: r.failure()?.errorText }));
page.on("response", r => { if (r.url().includes(":3212/")) responses.push({ path: new URL(r.url()).pathname, status: r.status() }); });
page.on("console", m => {
  if (m.type() !== "error") return;
  if (rejectingPassword && m.text().includes("400 (Bad Request)")) return;
  if (m.text().includes("/realtime/v1/websocket")) warnings.push("Local fixture API does not implement Realtime; ordinary HTTP reads remain available.");
  else failures.push({ console: m.text() });
});
try {
  await page.goto(base + "/admin");
  await page.waitForURL(base + "/login");
  checks.push("Anonymous protected route redirects to login");
  await page.locator('input[type="email"]').fill("a@example.invalid");
  rejectingPassword = true;
  await page.locator('input[type="password"]').fill("incorrect-local-password");
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await page.locator('.auth-error[role="alert"]').waitFor();
  rejectingPassword = false;
  assert.equal(new URL(page.url()).pathname, "/login");
  checks.push("Incorrect password cannot enter CRM");
  await page.locator('input[type="password"]').fill("demo-local-only");
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await page.getByRole("heading", { name: "Próximas ações" }).waitFor();
  checks.push("Login through form with supplied credentials");
  for (const route of ["/admin", "/admin/meu-trabalho", "/admin/agenda", "/admin/imoveis", "/admin/negocios", "/admin/apresentacoes"]) {
    await page.goto(base + route);
    await page.locator(".crm-main").waitFor();
    assert.equal(await page.getByText("Sua conta não tem acesso ao CRM.", { exact: true }).count(), 0);
    checks.push(route);
  }
  await page.reload();
  await page.locator(".crm-main").waitFor();
  checks.push("Session survives ordinary page reload");
  await page.goto(base + "/admin/agenda");
  await page.getByRole("button", { name: "Tarefas", exact: true }).click();
  await page.getByLabel("Período dos compromissos").selectOption("overdue");
  await page.getByText("Retornar para Marina", { exact: true }).waitFor();
  await page.getByLabel("Filtrar compromissos").selectOption("closed");
  assert.equal(await page.getByText("Retornar para Marina", { exact: true }).count(), 0);
  await page.getByLabel("Filtrar compromissos").selectOption("pending");
  await page.getByText("Retornar para Marina", { exact: true }).waitFor();
  checks.push("Agenda period and completion filters preserve pending returns");
  const dir = path.join(process.env.LOCALAPPDATA, "PrivilegeCRM-Operations/operational-login-fix-20261125");
  await fs.mkdir(dir, { recursive: true });
  await page.goto(base + "/admin");
  await page.getByRole("heading", { name: "Próximas ações" }).waitFor();
  await page.screenshot({ path: path.join(dir, "dashboard-authenticated.png"), fullPage: true });
  await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
  await page.waitForURL(base + "/login");
  await page.goto(base + "/admin");
  await page.waitForURL(base + "/login");
  checks.push("Logout restores route protection");
  for (const alias of ["b", "gestor", "admin"]) {
    await page.locator('input[type="email"]').fill(`${alias}@example.invalid`);
    await page.locator('input[type="password"]').fill("demo-local-only");
    await page.getByRole("button", { name: "Entrar no workspace" }).click();
    await page.waitForURL(base + "/admin");
    await page.locator(".crm-main").waitFor();
    if (alias === "b") {
      await page.getByText("Retorno privado B", { exact: true }).first().waitFor();
      assert.equal(await page.getByText("Retornar para Marina", { exact: true }).count(), 0);
    }
    checks.push(`Official local form login and role guard: ${alias}`);
    await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
    await page.waitForURL(base + "/login");
  }
  assert.deepEqual(failures, []);
} catch (e) { process.exitCode = 1; failures.push({ error: e.message }); }
finally {
  await browser.close();
  const report = { environment: "Loopback synthetic fixtures only", network_intercepted: false, checks, responses, failures, warnings: [...new Set(warnings)], result: process.exitCode ? "FAIL" : "PASS" };
  await fs.writeFile("tests/security/crm-demo-auth-browser-20261125.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ result: report.result, checks, failures, warnings: report.warnings }));
}
