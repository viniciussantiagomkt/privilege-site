import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const results = [];
const token = "00000000-0000-4000-8000-000000000018";
const title = "Imovel sintetico de compatibilidade";
const property = {
  id: 991118, slug: "compatibilidade-sintetica", title,
  description: "Registro ficticio somente em memoria para validar a atualizacao de dependencias.",
  location: "Campina Grande", city: "Campina Grande", city_slug: "campina-grande",
  neighborhood: "Centro", neighborhood_slug: "centro", category: "Casa",
  type: "Casa", status: "ativo", price: "420000", area: "120",
  bedrooms: 3, bathrooms: 2, suites: 1, garage: 1, featured: true,
  publish_on_site: true, workflow_status: "publicado", deleted_at: null,
  property_code: "TEST-18", images: ["/categories/casas.webp"],
  created_at: "2026-11-18T00:00:00Z", updated_at: "2026-11-18T00:00:00Z",
};
const presentation = {
  title: "Apresentacao sintetica local", message: "Somente fixture em memoria.",
  properties: [property], assets: [], broker: null,
};
const upstream = [];
const image = await readFile("public/categories/casas.webp");
const fixture = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  upstream.push({ method: req.method, path: url.pathname });
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  if (url.pathname === "/auth/v1/token") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ code: "invalid_credentials", message: "Synthetic rejected login" }));
    return;
  }
  let body;
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/crm_public_presentation") {
    let input = "";
    for await (const chunk of req) input += chunk;
    body = JSON.parse(input).target_token === token ? presentation : null;
  } else if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end(); return;
  } else if (url.pathname.startsWith("/storage/v1/object/authenticated/")) {
    res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": image.length });
    res.end(image); return;
  } else {
    const table = url.pathname.split("/").at(-1);
    body = table === "properties"
      ? url.searchParams.get("slug") && url.searchParams.get("slug") !== "eq." + property.slug
        ? [] : url.searchParams.get("id")?.startsWith("neq.") ? [] : [property]
      : table === "property_images"
        ? [{ property_id: property.id, url: property.images[0], is_main: true, sort_order: 0 }]
        : [];
    if (req.headers.accept?.includes("vnd.pgrst.object+json")) body = body[0] ?? null;
  }
  res.writeHead(200, { "Content-Type": "application/json", "Content-Range": "0-0/1" });
  res.end(JSON.stringify(body));
});
await new Promise((resolve, reject) => {
  fixture.once("error", reject);
  fixture.listen(0, "127.0.0.1", resolve);
});
const reserve = createServer();
await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const base = "http://127.0.0.1:" + port;
const backend = "http://127.0.0.1:" + fixture.address().port;
// An allowlisted child environment prevents inherited credentials or integrations.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|SystemRoot|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|ProgramFiles|ProgramFiles\(x86\)|ComSpec|PATHEXT)$/i.test(key)));
Object.assign(env, {
  NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
  VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/crm-stage03-dependencies-20261118",
  NEXT_PUBLIC_SUPABASE_URL: backend,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-local-fixture-not-a-credential",
  NEXT_PUBLIC_SITE_URL: base,
});
const children = [];
const external = new Set();
let browser;
async function runNext(args) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], {
    env, stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  let output = "";
  child.stdout.on("data", b => { output += b; });
  child.stderr.on("data", b => { output += b; });
  return { child, output: () => output };
}
function record(name, passed, details = {}) {
  results.push({ name, result: passed ? "PASS" : "FAIL", ...details });
}
try {
  assert.equal(JSON.parse(await readFile("node_modules/next/package.json")).version, "16.4.6");
  const build = await runNext(["build"]);
  const buildExit = await new Promise(resolve => build.child.once("exit", resolve));
  record("production build using loopback fixtures only", buildExit === 0, { exit_code: buildExit });
  if (buildExit !== 0) {
    console.error(build.output().slice(-5000)); throw new Error("Build failed");
  }
  await runNext(["start", "--hostname", "127.0.0.1", "--port", String(port)]);
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(base + "/login"); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, "Local production server must start");
  for (const route of ["/", "/imoveis", "/contato", "/sobre", "/corretores", "/links", "/login",
    "/imoveis/categoria/casas", "/imoveis/cidade/campina-grande", "/imoveis/" + property.slug,
    "/robots.txt", "/sitemap.xml"]) {
    const r = await fetch(base + route); const html = await r.text();
    record("HTTP " + route, r.status === 200 && !html.includes("Internal Server Error"), { status: r.status });
  }
  for (const [route, options, status] of [
    ["/api/leads", { method: "POST", body: "invalid-json" }, 400],
    ["/api/conversions", { method: "POST", body: "invalid-json" }, 400],
    ["/api/conversions", { method: "GET" }, 405],
    ["/api/admin/site-analytics", {}, 401],
    ["/api/admin/brokers", { method: "POST", body: "{}" }, 501],
    ["/api/presentation-open", { method: "POST", body: "{}" }, 400],
    ["/api/presentation-open", { method: "POST", headers: { Origin: "https://foreign.invalid" }, body: "{}" }, 403],
    ["/api/property-media/invalid", {}, 404],
    ["/api/presentation-media/invalid/1", {}, 404],
    ["/api/property-media/" + token + "/" + token + ".webp", {}, 200],
  ]) {
    const r = await fetch(base + route, options);
    record("Route Handler " + (options.method || "GET") + " " + route.replaceAll(token, "[fixture]"),
      r.status === status, { expected_status: status, status: r.status });
    await r.arrayBuffer();
  }
  const optimized = await fetch(base + "/_next/image?url=%2Fbrand%2Fsymbol-blue.png&w=96&q=75");
  record("next/image optimization renders local image", optimized.ok &&
    optimized.headers.get("content-type")?.startsWith("image/"), { status: optimized.status });
  await optimized.arrayBuffer();

  browser = await chromium.launch({ channel: process.env.CRM_BROWSER_CHANNEL || "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const errors = [];
  await context.route("**/*", route => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1" || u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    external.add(u.hostname); return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.name));
  for (const route of ["/", "/imoveis", "/contato", "/login", "/imoveis/" + property.slug]) {
    await page.goto(base + route);
    await page.locator("main").first().waitFor();
    record("browser " + route, await page.locator("main").first().isVisible());
  }
  await page.goto(base + "/login");
  await page.locator("#email").fill("synthetic@example.invalid");
  await page.locator("#password").fill("synthetic-rejected-not-a-password");
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await page.locator("form [role=alert]").waitFor();
  record("login displays controlled local fixture rejection", await page.locator("form [role=alert]").isVisible());
  for (const route of ["/admin", "/admin/meu-trabalho", "/admin/leads", "/admin/crm", "/admin/corretores", "/admin/marketing", "/admin/apresentacoes"]) {
    await page.goto(base + route);
    await page.waitForURL("**/login");
    record("anonymous protected navigation " + route, new URL(page.url()).pathname === "/login");
  }
  await page.goto(base + "/apresentacoes/" + token);
  await page.getByRole("heading", { name: presentation.title, exact: true }).waitFor();
  record("valid local fixture presentation renders", true);
  await page.goto(base + "/apresentacoes/invalid");
  record("invalid presentation rejected", await page.getByText("This page could not be found.").isVisible());
  await page.goto(base + "/apresentacoes/00000000-0000-4000-8000-000000000019");
  record("missing local fixture presentation rejected", await page.getByText("This page could not be found.").isVisible());
  await page.goto(base + "/imoveis/" + property.slug);
  await page.locator('img[src*="casas.webp"]').first().waitFor();
  await page.waitForFunction(() => [...document.images].some(i => i.src.includes("casas.webp") && i.complete && i.naturalWidth > 0));
  const renderedImage = await page.locator('img[src*="casas.webp"]').evaluateAll(imgs => imgs.some(i => i.complete && i.naturalWidth > 0));
  record("property page images decode", renderedImage);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/imoveis", "/login", "/imoveis/" + property.slug]) {
    await page.goto(base + route);
    record("mobile no overflow " + route,
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  record("no browser runtime exceptions", errors.length === 0, { error_names: errors });
  record("no integration scripts in local preview build", !/googletagmanager|clarity\.ms\/tag|connect\.facebook/.test(await page.content()));
  console.log(JSON.stringify({ external_hosts_blocked_by_test: [...external].sort() }));
} catch (error) {
  record("smoke infrastructure", false, { error: error.message });
} finally {
  if (browser) await browser.close();
  for (const child of children) {
    if (child.exitCode === null) {
      const ended = new Promise(resolve => child.once("exit", resolve));
      child.kill("SIGTERM");
      await Promise.race([ended, new Promise(resolve => setTimeout(resolve, 5000))]);
    }
  }
  await new Promise(resolve => fixture.close(resolve));
  const report = {
    executed_utc: new Date().toISOString(),
    environment: "Local Next production build and Edge headless; loopback HTTP fixtures only, NOT Supabase/Auth/staging homologation",
    no_remote_credentials: true, no_remote_database: true,
    synthetic_records_in_memory_only: true,
    external_hosts_blocked_before_network: [...external].sort(),
    remote_authenticated_scenarios: "BLOCKED: no own legitimate authorized sessions; not simulated as PASS",
    results,
    upstream_methods: [...new Set(upstream.map(r => r.method))].sort(),
    summary: { passed: results.filter(r => r.result === "PASS").length, failed: results.filter(r => r.result === "FAIL").length },
  };
  await writeFile("tests/security/crm-dependency-smoke-20261118.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}
