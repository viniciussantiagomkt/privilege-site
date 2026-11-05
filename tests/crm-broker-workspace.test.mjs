import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

function load(path, deps = {}) {
  const file = fileURLToPath(new URL(path, import.meta.url)),
    m = new Module(file),
    require = createRequire(file);
  m.require = (name) => deps[name] || require(name);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const model = load("../lib/crm/model.ts");
const work = load("../lib/crm/broker-workspace.ts", { "./model": model });
const data = {
  ...model.EMPTY_DATA,
  leads: [
    {
      id: 11,
      name: "Lead fictício",
      phone: "83000000000",
      status: "novo",
      notes: "Fixture",
      first_contact_at: null,
    },
  ],
  clients: [
    {
      id: 12,
      name: "Cliente fictício",
      contact_type: "cliente",
      phone: "83000000000",
    },
  ],
  properties: [
    {
      id: 13,
      title: "Imóvel fictício",
      property_code: "FIX-13",
      location: "Bairro fixture",
      status: "ativo",
      workflow_status: "aprovado",
    },
  ],
  tasks: [
    {
      id: 14,
      title: "Retorno fictício",
      due_at: "2026-11-03T13:00:00Z",
      status: "pendente",
    },
  ],
  visits: [
    {
      id: 15,
      client_id: 12,
      property_id: 13,
      scheduled_at: "2026-11-03T16:00:00Z",
      status: "agendada",
    },
  ],
  proposals: [{ id: 16, client_id: 12, property_id: 13, status: "enviada" }],
  negotiations: [{ id: 17, proposal_id: 16, status: "aberta" }],
};
test("four stable tabs and bounded demand plans exclude inactive commercial/marketing tables", () => {
  assert.deepEqual(
    work.WORK_TABS.map((t) => t.id),
    ["hoje", "atendimentos", "imoveis", "negocios"],
  );
  assert.deepEqual(work.WORK_TABLES.imoveis, ["properties"]);
  assert.deepEqual(work.WORK_TABLES.atendimentos, [
    "leads",
    "clients",
    "crm_contact_links",
  ]);
  for (const rows of Object.values(work.WORK_TABLES))
    assert.ok(!rows.includes("sales") && !rows.includes("marketing_assets"));
  assert.equal(work.workTab("forged"), "hoje");
});
test("record IDs are strict positive safe integers, not coercions or path fragments", () => {
  for (const id of [
    null,
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    "01",
    "Infinity",
    "9007199254740992",
    "../1",
  ])
    assert.equal(work.recordId(id), null);
  assert.equal(work.recordId("123"), 123);
});
test("daily queue uses Campina Grande civil day, excludes completed/future/invalid dates", () => {
  const rows = work.workRecords(
    "hoje",
    {
      ...data,
      tasks: [
        ...data.tasks,
        {
          id: 21,
          title: "Próximo dia",
          due_at: "2026-11-04T03:00:00Z",
          status: "pendente",
        },
        {
          id: 22,
          title: "Concluída",
          due_at: "2026-11-03T12:00:00Z",
          status: "concluida",
        },
        { id: 23, title: "Inválida", due_at: "bad", status: "pendente" },
        {
          id: 24,
          title: "Fim do dia",
          due_at: "2026-11-04T02:59:59Z",
          status: "pendente",
        },
      ],
    },
    "",
    new Date("2026-11-03T17:00:00Z"),
  );
  assert.deepEqual(
    rows.map((r) => r.id),
    [14, 15, 24],
  );
});
test("search and selection only resolve records in the supplied authorized snapshot", () => {
  assert.deepEqual(
    work.workRecords("atendimentos", data, "Lead fictício").map((r) => r.id),
    [11],
  );
  assert.deepEqual(
    work.workRecords("imoveis", data, "FIX-13").map((r) => r.id),
    [13],
  );
  assert.deepEqual(
    work.workRecords("negocios", data, "").map((r) => r.kind),
    ["proposal", "negotiation"],
  );
  assert.deepEqual(
    work.workRecords("atendimentos", model.EMPTY_DATA, "Lead fictício"),
    [],
  );
});
test("only existing authorized CRM profiles expose creation navigation, not visitor roles", () => {
  for (const role of ["admin", "manager", "broker", "corretor"])
    assert.equal(work.canAddWork(role, "fixture"), true);
  for (const role of ["", "visitor", "authenticated", "service_role"])
    assert.equal(work.canAddWork(role, "fixture"), false);
  assert.equal(work.canAddWork("admin", ""), false);
});
test("context actions preserve old specialized routes and open their existing editors", () => {
  const pairs = {
    task: "agenda?task=1",
    visit: "agenda?visit=1",
    lead: "leads?lead=1",
    contact: "contatos?contact=1",
    property: "imoveis?imovel=1",
    proposal: "negocios?proposal=1",
    negotiation: "negocios?negotiation=1",
  };
  for (const [kind, suffix] of Object.entries(pairs)) {
    assert.equal(work.workDestination(kind, 1), `/admin/${suffix}`);
    assert.match(work.workDestination(kind), /\?novo=/);
    assert.ok(
      fs.existsSync(
        new URL(
          `../app${work.WORK_DESTINATIONS[kind].path}/page.tsx`,
          import.meta.url,
        ),
      ),
    );
  }
  assert.ok(fs.existsSync(new URL("../app/admin/page.tsx", import.meta.url)));
});
function render({
  tab = "atendimentos",
  loading = false,
  errors = {},
  role = "broker",
  rows = data,
} = {}) {
  const ctx = {
    userId: "fixture",
    role,
    routeSearch: `aba=${tab}`,
    data: rows,
    query: "",
    loading,
    errors,
    reload: async () => {},
  };
  const workspace = { useWorkspace: () => ctx };
  const ui = load("../components/crm/UI.tsx", { "./Workspace": workspace });
  const { BrokerWorkspace } = load("../components/crm/BrokerWorkspace.tsx", {
    "./Workspace": workspace,
    "./UI": ui,
    "next/navigation": { useRouter: () => ({ replace() {} }) },
    "next/link": {
      default: ({ children, ...props }) => createElement("a", props, children),
    },
    "@/lib/crm/broker-workspace": work,
    "@/lib/crm/model": model,
    "./TaskCompleteButton": {},
    "./RecordContactButton": {},
    "./LeadHistory": {},
    "./ContactWhatsAppLink": {},
    "./ClientService": {},
  });
  return renderToStaticMarkup(createElement(BrokerWorkspace));
}
test("loading and failures hide records and totals rather than paint a false empty result", () => {
  for (const config of [
    { loading: true },
    { errors: { leads: "More than 500" } },
    { errors: { session: "Sessão inválida" } },
  ]) {
    const html = render(config);
    assert.ok(!html.includes("Lead fictício"));
    assert.ok(!html.includes("registros encontrados"));
    assert.ok(
      html.includes(
        config.loading
          ? "Carregando esta aba"
          : "Dados desta aba indisponíveis",
      ),
    );
  }
});
test("real markup has accessible tabs, one shared search scope and no simulated future features", () => {
  const html = render();
  assert.equal((html.match(/role="tab"/g) || []).length, 4);
  assert.ok(html.includes('aria-selected="true"'));
  assert.ok(html.includes('role="tabpanel"'));
  assert.ok(html.includes("até 500 registros"));
  assert.ok(html.includes("Lead fictício"));
  assert.ok(!html.includes("<input"));
  assert.ok(!html.includes("comissões"));
  assert.ok(!render({ role: "visitor" }).includes("work-add-options"));
});
