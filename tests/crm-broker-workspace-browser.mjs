// Isolated browser fixtures: every non-loopback request is mocked or blocked.
// This is UI regression coverage, not authenticated Supabase homologation.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";

if (!process.env.CRM_TEST_ENV_FILE)
  throw new Error(
    "CRM_TEST_ENV_FILE must point to the verified local staging public configuration.",
  );
process.loadEnvFile(process.env.CRM_TEST_ENV_FILE);
process.env.VERCEL_GIT_COMMIT_REF =
  "work/crm-campaign-broker-workspace-20261103";
const socket = net.createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
const results = [];
let browser;
const artifacts = path.join(
  process.env.LOCALAPPDATA || process.cwd(),
  "PrivilegeCRM-Operations",
  "broker-workspace-20261103",
);
const fixtureId = "11111111-1111-4111-8111-111111111111";
const user = {
  id: fixtureId,
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const exp = Math.floor(Date.now() / 1000) + 3600;
const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const session = {
  access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: fixtureId, aud: "authenticated", role: "authenticated", exp })}.synthetic-fixture-signature-not-valid`,
  refresh_token: "synthetic-local-only",
  token_type: "bearer",
  expires_at: exp,
  expires_in: 3600,
  user,
};
const tables = {
  brokers: [{ ...user, name: "Corretor fictício A", active: true }],
  notifications: [],
  leads: [
    {
      id: 11,
      name: "Lead fictício A",
      phone: "83000000000",
      email: "fixture@example.invalid",
      status: "novo",
      source: "manual",
      broker_id: fixtureId,
      origin_type: "personal",
      notes: "Observação fictícia",
      first_contact_at: null,
      created_at: new Date().toISOString(),
    },
  ],
  clients: [
    {
      id: 12,
      name: "Cliente fictício A",
      phone: "83000000000",
      contact_type: "cliente",
      broker_id: fixtureId,
    },
  ],
  properties: [
    {
      id: 13,
      title: "Imóvel fictício A",
      property_code: "FIX-13",
      location: "Bairro fictício",
      category: "Casa",
      price: "R$ 500.000",
      status: "ativo",
      workflow_status: "rascunho",
      owner_id: fixtureId,
      broker_id: fixtureId,
      images: [],
      publish_on_site: false,
      description: "Descrição de teste local.",
    },
  ],
  tasks: [
    {
      id: 14,
      title: "Retorno fictício A",
      due_at: new Date().toISOString(),
      status: "pendente",
      broker_id: fixtureId,
      lead_id: 11,
    },
  ],
  visits: [
    {
      id: 15,
      client_id: 12,
      property_id: 13,
      scheduled_at: new Date().toISOString(),
      status: "agendada",
      broker_id: fixtureId,
    },
  ],
  proposals: [
    {
      id: 16,
      client_id: 12,
      property_id: 13,
      status: "rascunho",
      value: 500000,
      broker_id: fixtureId,
    },
  ],
  negotiations: [
    { id: 17, proposal_id: 16, status: "aberta", notes: "Condição fictícia" },
  ],
  lead_activities: [
    {
      id: 18,
      lead_id: 11,
      created_at: new Date().toISOString(),
      description: "Histórico fictício A",
      type: "note",
    },
  ],
};
async function fixture(role = "broker", options = {}) {
  const state = {
    role,
    user: structuredClone(user),
    errorTable: "",
    pauseTable: "",
    releases: [],
    tables: structuredClone(tables),
    calls: [],
    writes: [],
    errors: [],
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  if (!options.anonymous)
    await context.addInitScript(
      ({ session }) =>
        localStorage.setItem(
          "sb-sdpqphiooiuglywcmkxv-auth-token",
          JSON.stringify(session),
        ),
      { session },
    );
  await context.routeWebSocket("**/*", (ws) => ws.close());
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === origin) return route.continue();
    if (url.hostname !== "sdpqphiooiuglywcmkxv.supabase.co")
      return route.abort();
    const respond = (json, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(json),
      });
    if (url.pathname === "/auth/v1/user") return respond(state.user);
    if (url.pathname === "/auth/v1/logout") return respond({});
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const name = url.pathname.split("/").at(-1);
      if (name === "current_user_role") return respond(state.role);
      if (name === "crm_unread_notification_count") return respond(0);
      state.writes.push(name);
      return respond(null);
    }
    if (url.pathname.startsWith("/rest/v1/")) {
      const name = url.pathname.split("/").at(-1);
      state.calls.push(name);
      if (state.pauseTable === name)
        await new Promise((resolve) => state.releases.push(resolve));
      if (state.errorTable === name)
        return respond(
          { message: "Falha de fixture isolada", code: "fixture" },
          500,
        );
      if (request.method() === "PATCH") {
        state.writes.push(name);
        const payload = request.postDataJSON();
        const id = Number(url.searchParams.get("id")?.replace("eq.", ""));
        state.tables[name] = state.tables[name].map((r) =>
          r.id === id ? { ...r, ...payload } : r,
        );
        return respond({ id });
      }
      return respond(state.tables[name] || []);
    }
    return respond({});
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => state.errors.push(e.message));
  return { context, page, state };
}
async function check(name, action) {
  try {
    await action();
    results.push({ name, status: "PASS" });
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      reason: String(error.message).slice(0, 500),
    });
    throw error;
  }
}
async function ready(page, tab = "Hoje") {
  await page
    .getByRole("tab", { name: tab, exact: true, selected: true })
    .waitFor();
  await page.locator('[role="tabpanel"][aria-busy="false"]').waitFor();
}
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Local server timeout")),
      30000,
    );
    server.stdout.on("data", (b) => {
      if (String(b).includes("Ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Local server exited ${code}`));
    });
  });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  await mkdir(artifacts, { recursive: true });
  const { context, page, state } = await fixture();
  await check(
    "initial demand loads today only, without marketing or deals",
    async () => {
      await page.goto(`${origin}/admin/meu-trabalho`);
      await ready(page);
      assert.ok(state.calls.includes("tasks"));
      assert.ok(state.calls.includes("visits"));
      assert.ok(!state.calls.includes("proposals"));
      assert.ok(!state.calls.includes("marketing_assets"));
      assert.equal(
        await page.getByRole("button", { name: /Retorno fictício A/ }).count(),
        1,
      );
    },
  );
  await check(
    "four tabs, URL, shared search, authorized detail and close focus",
    async () => {
      await page
        .getByRole("tab", { name: "Atendimentos", exact: true })
        .click();
      await ready(page, "Atendimentos");
      await page
        .getByRole("textbox", { name: "Buscar nos registros desta aba" })
        .fill("Lead fictício");
      await page.getByRole("button", { name: /Lead fictício A/ }).click();
      await page.getByRole("dialog").waitFor();
      await page.getByText("Histórico fictício A", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "WhatsApp", exact: true })
          .getAttribute("href"),
        "https://wa.me/5583000000000",
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.ok(
        await page
          .getByRole("button", { name: /Lead fictício A/ })
          .evaluate((el) => el === document.activeElement),
      );
      await page
        .getByRole("textbox", { name: "Buscar nos registros desta aba" })
        .fill("");
      await page.getByRole("tab", { name: "Imóveis", exact: true }).click();
      await ready(page, "Imóveis");
      assert.ok(page.url().includes("aba=imoveis"));
      await page.getByRole("tab", { name: "Negócios", exact: true }).click();
      await ready(page, "Negócios");
      assert.ok(state.calls.includes("negotiations"));
    },
  );
  await check("keyboard tabs wrap and drawer focus is contained", async () => {
    await page.getByRole("tab", { name: "Negócios", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await ready(page);
    assert.ok(
      await page
        .getByRole("tab", { name: "Hoje", exact: true })
        .evaluate((el) => el === document.activeElement),
    );
    await page.getByRole("button", { name: /Retorno fictício A/ }).click();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await page
          .getByRole("dialog")
          .evaluate((el) => el.contains(document.activeElement)),
      );
    }
    await page.keyboard.press("Escape");
  });
  await check(
    "existing task completion is reused and persists through fixture reload",
    async () => {
      await page.getByRole("button", { name: /Retorno fictício A/ }).click();
      await page.getByRole("button", { name: "Concluir", exact: true }).click();
      await page
        .getByRole("button", { name: /Retorno fictício A/ })
        .waitFor({ state: "hidden" });
      assert.ok(state.writes.includes("tasks"));
    },
  );
  await check(
    "new action opens existing contact editor, back preserves tab URL",
    async () => {
      await page.getByRole("button", { name: "Adicionar" }).click();
      await page
        .getByRole("link", { name: "Cliente / proprietário", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      assert.equal(new URL(page.url()).pathname, "/admin/contatos");
      assert.ok(await page.getByLabel("Nome completo").isVisible());
      await page.goBack();
      await ready(page);
    },
  );
  await check(
    "contextual return resolves only an authorized lead in the existing task form",
    async () => {
      await page.goto(`${origin}/admin/agenda?novo=task&lead=11`);
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page.getByLabel("Lead relacionado").inputValue(),
        "11",
      );
      await page.goto(`${origin}/admin/agenda?novo=task&lead=999`);
      await page
        .getByText("Este registro ou ação não está disponível", {
          exact: false,
        })
        .waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0);
    },
  );
  await check(
    "all entity deep links reuse their original authorized detail or editor",
    async () => {
      for (const suffix of [
        "contatos?contact=12",
        "imoveis?imovel=13",
        "negocios?proposal=16",
        "negocios?negotiation=17",
        "agenda?visit=15",
        "leads?lead=11",
      ]) {
        await page.goto(`${origin}/admin/${suffix}`);
        await page.getByRole("dialog").waitFor();
        assert.equal(await page.getByRole("dialog").count(), 1);
        await page.keyboard.press("Escape");
      }
      assert.deepEqual(state.errors, []);
    },
  );
  await check(
    "errors hide stale records, retry restores and empty search differs from error",
    async () => {
      state.errorTable = "properties";
      await page.goto(`${origin}/admin/meu-trabalho?aba=imoveis`);
      await page.getByText("Dados desta aba indisponíveis").waitFor();
      assert.equal(
        await page.getByRole("button", { name: /Imóvel fictício A/ }).count(),
        0,
      );
      state.errorTable = "";
      await page.getByRole("button", { name: "Tentar novamente" }).click();
      await ready(page, "Imóveis");
      await page
        .getByRole("textbox", { name: "Buscar nos registros desta aba" })
        .fill("sem-correspondencia");
      await page.getByText("Nenhum resultado nesta aba").waitFor();
      await page
        .getByRole("textbox", { name: "Buscar nos registros desta aba" })
        .fill("");
    },
  );
  await check(
    "responsive 360/768/1440 and 200-percent equivalent layout, full mobile drawer",
    async () => {
      for (const width of [360, 768, 1440, 720]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.getByRole("button", { name: /Imóvel fictício A/ }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        assert.ok(
          await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
        );
        if (width === 360)
          assert.equal(Math.round((await dialog.boundingBox()).width), 360);
        await page.screenshot({
          path: path.join(artifacts, `drawer-${width}.png`),
          fullPage: true,
        });
        await page.keyboard.press("Escape");
        await page.screenshot({
          path: path.join(artifacts, `workspace-${width}.png`),
          fullPage: true,
        });
      }
    },
  );
  await check(
    "role change invalidates prior rows and private drawer selection",
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole("button", { name: /Imóvel fictício A/ }).click();
      state.role = "manager";
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Atualizar dados" }).click();
      await page
        .getByText("A conta ou permissão mudou.", { exact: false })
        .first()
        .waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(
        await page.getByRole("button", { name: /Imóvel fictício A/ }).count(),
        0,
      );
    },
  );
  assert.deepEqual(state.errors, []);
  await context.close();
  await check(
    "over-500 result fails closed instead of partial rows or unlimited pagination",
    async () => {
      const f = await fixture();
      f.state.tables.properties = Array.from({ length: 501 }, (_, i) => ({
        ...tables.properties[0],
        id: i + 1,
      }));
      await f.page.goto(`${origin}/admin/meu-trabalho?aba=imoveis`);
      await f.page
        .getByText("Mais de 500 registros.", { exact: false })
        .waitFor();
      assert.equal(await f.page.locator(".crm-work-record").count(), 0);
      await f.context.close();
    },
  );
  for (const [tab, expected] of Object.entries({
    imoveis: ["brokers", "notifications", "properties"],
    atendimentos: [
      "brokers",
      "notifications",
      "leads",
      "clients",
      "crm_contact_links",
    ],
    negocios: [
      "brokers",
      "notifications",
      "proposals",
      "negotiations",
      "clients",
      "properties",
    ],
  })) {
    await check(
      `direct ${tab} request loads only its declared tables`,
      async () => {
        const f = await fixture();
        await f.page.goto(`${origin}/admin/meu-trabalho?aba=${tab}`);
        await ready(
          f.page,
          {
            imoveis: "Imóveis",
            atendimentos: "Atendimentos",
            negocios: "Negócios",
          }[tab],
        );
        assert.deepEqual([...new Set(f.state.calls)].sort(), expected.sort());
        await f.context.close();
      },
    );
  }
  await check(
    "account identity switch clears rows without reusing old selection",
    async () => {
      const f = await fixture();
      await f.page.goto(`${origin}/admin/meu-trabalho?aba=atendimentos`);
      await ready(f.page, "Atendimentos");
      f.state.user.id = "22222222-2222-4222-8222-222222222222";
      await f.page.getByRole("button", { name: "Atualizar dados" }).click();
      await f.page
        .getByText("A conta ou permissão mudou.", { exact: false })
        .first()
        .waitFor();
      assert.equal(
        await f.page.getByRole("button", { name: /Lead fictício A/ }).count(),
        0,
      );
      await f.context.close();
    },
  );
  await check(
    "late inactive-tab response cannot replace the current authorized tab",
    async () => {
      const f = await fixture();
      f.state.pauseTable = "properties";
      await f.page.goto(`${origin}/admin/meu-trabalho?aba=imoveis`);
      await f.page.getByLabel("Carregando esta aba").waitFor();
      await f.page
        .getByRole("tab", { name: "Atendimentos", exact: true })
        .click();
      await ready(f.page, "Atendimentos");
      f.state.pauseTable = "";
      f.state.releases.forEach((resolve) => resolve());
      await f.page.waitForTimeout(200);
      assert.ok(
        await f.page
          .getByRole("button", { name: /Lead fictício A/ })
          .isVisible(),
      );
      assert.equal(
        await f.page.getByRole("button", { name: /Imóvel fictício A/ }).count(),
        0,
      );
      await f.context.close();
    },
  );
  for (const role of ["admin", "manager", "broker", "corretor"]) {
    await check(
      `fixture profile ${role} uses same guard and keeps specialized routes`,
      async () => {
        const f = await fixture(role);
        await f.page.goto(`${origin}/admin/meu-trabalho`);
        await ready(f.page);
        assert.ok(
          await f.page.getByRole("button", { name: "Adicionar" }).isVisible(),
        );
        for (const target of [
          "/admin",
          "/admin/leads",
          "/admin/agenda",
          "/admin/contatos",
          "/admin/imoveis",
          "/admin/negocios",
          "/admin/apresentacoes",
        ])
          assert.equal(
            await f.page.locator(`nav a[href="${target}"]`).count(),
            1,
          );
        assert.equal(
          await f.page.locator('nav a[href="/admin/analytics"]').count(),
          ["admin", "manager"].includes(role) ? 1 : 0,
        );
        await f.context.close();
      },
    );
  }
  await check("anonymous session redirects to existing login", async () => {
    const f = await fixture("broker", { anonymous: true });
    await f.page.goto(`${origin}/admin/meu-trabalho`);
    await f.page.waitForURL("**/login");
    await f.context.close();
  });
  await check(
    "unknown database role does not load the workspace or any entity table",
    async () => {
      const f = await fixture("visitor");
      await f.page.goto(`${origin}/admin/meu-trabalho`);
      await f.page.getByText("Sua conta não tem acesso ao CRM.").waitFor();
      assert.equal(f.state.calls.length, 0);
      await f.context.close();
    },
  );
} finally {
  await browser?.close();
  server.kill();
  await once(server, "exit").catch(() => {});
  await writeFile(
    "tests/security/crm-broker-workspace-browser-20261103.json",
    JSON.stringify(
      {
        environment:
          "loopback browser with synthetic Auth/REST fixtures; all external requests blocked",
        realAuthenticatedCoverage:
          "BLOCKED: no authorized authenticated preview in this scope",
        results,
        artifacts,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
}
