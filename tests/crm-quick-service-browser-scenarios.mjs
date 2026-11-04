import assert from "node:assert/strict";
import path from "node:path";

export async function runQuickServiceBrowser({
  fixture,
  ready,
  check,
  origin,
  artifacts,
}) {
  const f = await fixture("broker", { quick: true }),
    { page, state } = f;
  state.tables.clients[0].interest_profile = { purpose: "compra" };
  state.tables.clients[0].interest_revision = 0;
  state.tables.crm_contact_links = [
    { id: 21, contact_id: 12, property_id: 13, relation: "interesse" },
  ];
  state.tables.tasks[0].client_id = 12;
  state.tables.marketing_shares = [
    {
      id: 22,
      client_id: 12,
      owner_id: state.user.id,
      title: "Apresentação fictícia",
      token: "fixture-share-local",
      expires_at: "2099-01-01",
      revoked_at: null,
    },
  ];
  state.tables.brokers[0].phone = "83900000111";
  await page.goto(`${origin}/admin/meu-trabalho?aba=atendimentos`);
  await ready(page, "Atendimentos");
  await check(
    "quick client: minimal create in hub, no lead and no PII in URL",
    async () => {
      await page
        .getByRole("button", { name: "Novo cliente", exact: true })
        .click();
      await page.getByLabel("Nome completo").fill("Cliente fictício novo");
      await page.getByLabel("Telefone / WhatsApp").fill("(83) 90000-0044");
      await page.getByLabel("Tipo de interesse").selectOption("compra");
      const leads = state.tables.leads.length;
      await page
        .getByRole("button", { name: "Salvar cliente", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Cliente fictício novo", exact: true })
        .waitFor();
      assert.equal(state.tables.leads.length, leads);
      assert.equal(state.tables.clients.at(-1).phone, "5583900000044");
      assert.ok(!page.url().includes("fictício"));
      assert.equal(new URL(page.url()).pathname, "/admin/meu-trabalho");
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "quick client: duplicates open authorized existing row without a second insert",
    async () => {
      await page
        .getByRole("button", { name: "Novo cliente", exact: true })
        .click();
      await page.getByLabel("Nome completo").fill("Duplicata fictícia");
      await page.getByLabel("Telefone / WhatsApp").fill("+55 83 90000-0044");
      await page.getByLabel("Tipo de interesse").selectOption("aluguel");
      const count = state.tables.clients.length;
      await page
        .getByRole("button", { name: "Salvar cliente", exact: true })
        .click();
      await page
        .getByText("Possível duplicidade na sua carteira.", { exact: false })
        .waitFor();
      assert.equal(state.tables.clients.length, count);
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", { name: /Abrir cadastro existente/ })
        .click();
      await page
        .getByRole("dialog", { name: "Cliente fictício novo", exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "quick client: interest editing and no unrequested sections",
    async () => {
      await page.getByRole("button", { name: /Cliente fictício A/ }).click();
      assert.equal(
        state.rpcCalls.filter((r) => r.name === "crm_client_timeline").length,
        0,
      );
      await page
        .getByRole("button", { name: "Editar cliente", exact: true })
        .click();
      await page
        .getByText("Completar perfil de interesse (opcional)", { exact: true })
        .click();
      await page.getByLabel("Cidade", { exact: true }).fill("Campina Grande");
      await page
        .getByLabel("Orçamento mínimo (R$)", { exact: true })
        .fill("300000");
      await page
        .getByLabel("Orçamento máximo (R$)", { exact: true })
        .fill("600000");
      await page.getByLabel("Quartos", { exact: true }).fill("3");
      await page
        .getByLabel("Interesse em financiamento", { exact: true })
        .selectOption("true");
      await page
        .getByRole("button", { name: "Salvar cliente", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Editar cliente", exact: true })
        .waitFor();
      assert.equal(state.tables.clients[0].interest_profile.bedrooms, 3);
      assert.equal(state.tables.clients[0].interest_revision, 1);
      await page.getByText("Histórico de atividades", { exact: true }).click();
      await page
        .getByText("Perfil de interesse atualizado", { exact: true })
        .waitFor();
    },
  );
  await check(
    "client context: related records are lazy and errors differ from empty data",
    async () => {
      await page.getByText("Imóveis relacionados", { exact: true }).click();
      await page
        .getByRole("link", { name: "FIX-13 · Imóvel fictício A" })
        .waitFor();
      state.errorTable = "tasks";
      await page.getByText("Tarefas e retornos", { exact: true }).click();
      await page
        .getByText("Não foi possível carregar esta seção. Tente novamente.", {
          exact: true,
        })
        .waitFor();
      state.errorTable = "";
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await page.getByText("Retorno fictício A", { exact: true }).waitFor();
      await page.getByText("Visitas", { exact: true }).click();
      await page.getByText("agendada", { exact: true }).waitFor();
    },
  );
  await check(
    "WhatsApp: six editable templates, review gate, correct recipient and no fictitious contact",
    async () => {
      const before = state.writes.length;
      await page
        .getByRole("button", { name: "Preparar WhatsApp", exact: true })
        .click();
      await page
        .getByLabel("Apresentação autorizada", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "Abrir WhatsApp", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByLabel("Modelo", { exact: true })
          .locator("option")
          .count(),
        6,
      );
      await page.getByLabel("Modelo", { exact: true }).selectOption("visit");
      await page
        .getByLabel("Imóvel relacionado", { exact: true })
        .selectOption("13");
      await page
        .getByLabel("Visita vinculada", { exact: true })
        .selectOption("15");
      await page
        .getByRole("button", { name: "Preencher modelo selecionado" })
        .click();
      assert.ok(
        (await page.getByLabel("Mensagem para revisão").inputValue()).includes(
          "FIX-13",
        ),
      );
      await page.getByLabel("Revisei o destinatário e a mensagem.").check();
      const url = new URL(
        await page
          .getByRole("link", { name: "Abrir WhatsApp", exact: true })
          .getAttribute("href"),
      );
      assert.equal(url.hostname, "wa.me");
      assert.equal(url.pathname, "/5583000000000");
      assert.ok(url.searchParams.get("text").includes("Corretor fictício A"));
      await page
        .getByLabel("Mensagem para revisão")
        .fill("Mensagem fictícia revisada");
      assert.equal(
        await page
          .getByRole("link", { name: "Abrir WhatsApp", exact: true })
          .count(),
        0,
      );
      assert.equal(state.writes.length, before);
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", { name: "Voltar ao cliente", exact: true })
        .click();
    },
  );
  await check(
    "client actions: real contact confirmation, return and visit in the same drawer",
    async () => {
      await page.getByText("Próximo passo", { exact: true }).click();
      page.once("dialog", (d) => d.accept());
      await page
        .getByRole("button", {
          name: "Registrar contato realizado",
          exact: true,
        })
        .click();
      await page
        .getByText("Contato realizado registrado.", { exact: true })
        .waitFor();
      assert.equal(
        state.history.filter(
          (h) => h.description === "Contato registrado pelo corretor",
        ).length,
        1,
      );
      await page
        .getByRole("button", { name: "Agendar retorno", exact: true })
        .click();
      await page
        .getByLabel("Tarefa / retorno", { exact: true })
        .fill("Retorno local Etapa 03");
      await page
        .getByLabel("Data e horário", { exact: true })
        .fill("2026-11-10T10:00");
      state.failAfterInsert = true;
      await page.getByRole("button", { name: "Salvar", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByText(
          "Não foi possível confirmar o agendamento. Seus campos foram preservados.",
          { exact: true },
        )
        .waitFor();
      await page.getByRole("button", { name: "Salvar", exact: true }).click();
      await page
        .getByRole("button", { name: "Preparar WhatsApp", exact: true })
        .waitFor();
      assert.equal(
        state.tables.tasks.filter((t) => t.title === "Retorno local Etapa 03")
          .length,
        1,
      );
      assert.equal(state.tables.tasks.at(-1).client_id, 12);
      await page.getByText("Próximo passo", { exact: true }).click();
      await page
        .getByRole("button", { name: "Agendar visita", exact: true })
        .click();
      await page.getByLabel("Imóvel", { exact: true }).selectOption("13");
      await page
        .getByLabel("Data e horário", { exact: true })
        .fill("2026-11-11T10:00");
      await page.getByRole("button", { name: "Salvar", exact: true }).click();
      await page
        .getByRole("button", { name: "Preparar WhatsApp", exact: true })
        .waitFor();
      assert.equal(state.tables.visits.at(-1).client_id, 12);
      assert.equal(await page.getByRole("dialog").count(), 1);
      await page.keyboard.press("Escape");
    },
  );
  await check("quick draft: typed review only; apply is not save", async () => {
    await page
      .getByRole("button", { name: "Novo cliente", exact: true })
      .click();
    await page.getByText("Preparar um rascunho", { exact: true }).click();
    await page
      .getByLabel("Rascunho digitado", { exact: true })
      .fill("Nome: Rascunho fictício\nWhatsApp: 83900000555");
    await page
      .getByRole("button", { name: "Revisar campos", exact: true })
      .click();
    const count = state.tables.clients.length;
    await page
      .getByRole("button", {
        name: "Aplicar ao cadastro sem salvar",
        exact: true,
      })
      .click();
    assert.equal(
      await page.getByLabel("Nome completo").inputValue(),
      "Rascunho fictício",
    );
    assert.equal(state.tables.clients.length, count);
    assert.equal(await page.evaluate(() => window.__fixtureVoiceRequests), 0);
    page.once("dialog", (d) => d.accept());
    await page.keyboard.press("Escape");
  });
  await check(
    "schema pending: no fake success, fields preserved, retry reuses receipt",
    async () => {
      await page
        .getByRole("button", { name: "Novo cliente", exact: true })
        .click();
      await page.getByLabel("Nome completo").fill("Falha fictícia");
      await page.getByLabel("Telefone / WhatsApp").fill("83900000888");
      await page.getByLabel("Tipo de interesse").selectOption("compra");
      state.quickError = "PGRST202";
      await page
        .getByRole("button", { name: "Salvar cliente", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByText("Cadastro rápido ainda não habilitado neste ambiente.", {
          exact: false,
        })
        .waitFor();
      const a = state.rpcCalls
        .filter((r) => r.name === "crm_save_quick_client")
        .at(-1).args.action_id;
      state.quickError = "";
      await page
        .getByRole("button", { name: "Salvar cliente", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Falha fictícia", exact: true })
        .waitFor();
      assert.equal(
        state.rpcCalls.filter((r) => r.name === "crm_save_quick_client").at(-1)
          .args.action_id,
        a,
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "client draft keeps opening revision after a background refresh",
    async () => {
      await page.getByRole("button", { name: /Cliente fictício A/ }).click();
      await page
        .getByRole("button", { name: "Editar cliente", exact: true })
        .click();
      await page
        .getByLabel("Nome completo", { exact: true })
        .fill("Rascunho fictício concorrente");
      const openingRevision = state.tables.clients[0].interest_revision;
      state.tables.clients[0].interest_revision++;
      const loaded = page.waitForResponse((r) =>
        r.url().includes("/rest/v1/clients?"),
      );
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await loaded;
      await page.waitForTimeout(150);
      await page
        .getByRole("button", { name: "Salvar cliente", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByText(
          "O cadastro mudou em outra sessão. Reabra o cliente antes de editar.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        state.rpcCalls.filter((c) => c.name === "crm_save_quick_client").at(-1)
          .args.expected_revision,
        openingRevision,
      );
      assert.equal(state.tables.clients[0].name, "Cliente fictício A");
      page.once("dialog", (d) => d.dismiss());
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 1);
      page.once("dialog", (d) => d.accept());
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "client drawer: 360/768/1440 layout, keyboard focus and session clear",
    async () => {
      for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.getByRole("button", { name: /Cliente fictício A/ }).click();
        await page
          .getByRole("button", { name: "Editar cliente", exact: true })
          .click();
        await page
          .getByText("Completar perfil de interesse (opcional)", {
            exact: true,
          })
          .click();
        const modal = page.getByRole("dialog");
        assert.ok(
          await modal.evaluate((el) => el.scrollWidth <= el.clientWidth),
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press("Tab");
          assert.ok(
            await modal.evaluate((el) => el.contains(document.activeElement)),
          );
        }
        await page.screenshot({
          path: path.join(artifacts, `quick-client-${width}.png`),
          fullPage: true,
        });
        await page.keyboard.press("Escape");
      }
      await page.getByRole("button", { name: /Cliente fictício A/ }).click();
      state.user.id = "22222222-2222-4222-8222-222222222222";
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page
        .getByText("A conta ou permissão mudou.", { exact: false })
        .first()
        .waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0);
    },
  );
  assert.deepEqual(state.errors, []);
  await f.context.close();
}
