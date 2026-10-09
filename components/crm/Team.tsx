"use client";
import { useState } from "react";
import { Users, Target, Wallet, Clock, Download } from "lucide-react";
import { useWorkspace } from "./Workspace";
import { supabase } from "@/lib/supabase";
import {
  PageHeading,
  SectionState,
  Metric,
  Panel,
  Empty,
  Badge,
  Modal,
  EntityForm,
  Button,
  text,
  optional,
  type Field,
} from "./UI";
import { initials, money, matches, type Broker } from "@/lib/crm/model";
export function Team() {
  const ctx = useWorkspace();
  const [edit, setEdit] = useState<Broker | null>(null);
  const [period, setPeriod] = useState("month");
  const now = new Date();
  const since =
    period === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : period === "quarter"
        ? new Date(now.getFullYear(), now.getMonth() - 2, 1)
        : new Date(0);
  const leadRows = ctx.data.leads.filter(
    (l) => new Date(l.created_at) >= since,
  );
  const saleRows = ctx.data.sales.filter(
    (s) => new Date(s.date + "T12:00:00") >= since,
  );
  const brokers = ctx.data.brokers.filter(
    (b) =>
      (ctx.operations || b.id === ctx.userId) &&
      matches(ctx.query, b.name, b.email),
  );
  const metrics = brokers.map((b) => ({
    broker: b,
    leads: leadRows.filter((l) => l.broker_id === b.id),
    properties: ctx.data.properties.filter(
      (p) => p.broker_id === b.id || p.owner_id === b.id,
    ),
    sales: saleRows.filter((s) => s.broker_id === b.id),
    tasks: ctx.data.tasks.filter(
      (t) =>
        t.broker_id === b.id &&
        t.status === "concluida" &&
        new Date(t.updated_at || t.created_at) >= since,
    ),
  }));
  const fields: Field[] = [
    { name: "name", label: "Nome", required: true, value: edit?.name },
    { name: "phone", label: "Telefone", type: "tel", value: edit?.phone },
    { name: "creci", label: "CRECI", value: edit?.creci },
  ];
  const conversion = leadRows.length
    ? Math.round(
        (leadRows.filter((l) => l.status === "convertido").length /
          leadRows.length) *
          100,
      )
    : 0;
  function csv() {
    const quote = (v: string | number) =>
      '"' + String(v).replaceAll('"', '""') + '"';
    const rows = [
      [
        "Corretor",
        "Leads",
        "Convertidos",
        "Imoveis",
        "Tarefas concluidas",
        "Vendas",
        "Volume vendido",
      ],
      ...metrics.map((m) => [
        m.broker.name,
        m.leads.length,
        m.leads.filter((l) => l.status === "convertido").length,
        m.properties.length,
        m.tasks.length,
        m.sales.length,
        m.sales.reduce((a, s) => a + Number(s.value || 0), 0),
      ]),
    ];
    const blob = new Blob(
      ["\ufeff" + rows.map((r) => r.map(quote).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privilege-produtividade.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow={
          ctx.operations ? "Gestão e produtividade" : "Seu espaço individual"
        }
        title={ctx.operations ? "Equipe e desempenho" : "Meu desempenho"}
        description="Uma visão clara do trabalho e dos resultados de cada corretor."
        action={
          <Button secondary onClick={csv}>
            <Download size={15} />
            Exportar relatório
          </Button>
        }
      />
      <div className="crm-toolbar">
        <select
          aria-label="Período do relatório"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="month">Mês atual</option>
          <option value="quarter">Últimos três meses</option>
          <option value="all">Todo o histórico</option>
        </select>
        <Badge>{ctx.operations ? "Visão gerencial" : "Seus resultados"}</Badge>
      </div>
      <SectionState tables={["brokers", "leads", "sales", "tasks"]}>
        <div className="crm-metrics">
          <Metric
            label="Corretores ativos"
            value={brokers.filter((b) => b.active).length}
            detail="Perfis visíveis no seu escopo"
            icon={<Users size={18} />}
          />
          <Metric
            label="Conversão de leads"
            value={`${conversion}%`}
            detail="Convertidos / recebidos no período"
            icon={<Target size={18} />}
          />
          <Metric
            label="Volume vendido"
            value={money(
              saleRows.reduce((a, s) => a + Number(s.value || 0), 0),
            )}
            detail="Vendas registradas no período"
            icon={<Wallet size={18} />}
          />
          <Metric
            label="Tarefas concluídas"
            value={metrics.reduce((a, m) => a + m.tasks.length, 0)}
            detail="Concluídas e atualizadas no período"
            icon={<Clock size={18} />}
          />
        </div>
        <div className="crm-team-grid">
          {metrics.map((m) => (
            <article key={m.broker.id} className="crm-team-card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="crm-user-avatar">
                  {initials(m.broker.name)}
                </span>
                <Badge tone={m.broker.active ? "green" : "muted"}>
                  {m.broker.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <h3>{m.broker.name}</h3>
              <p>{m.broker.email}</p>
              <p>CRECI {m.broker.creci || "não informado"}</p>
              <div className="crm-team-stats">
                <div>
                  <b>{m.leads.length}</b>
                  <small>Leads</small>
                </div>
                <div>
                  <b>{m.properties.length}</b>
                  <small>Imóveis</small>
                </div>
                <div>
                  <b>{m.sales.length}</b>
                  <small>Vendas</small>
                </div>
              </div>
              <div className="crm-card-footer">
                <small>
                  {money(m.sales.reduce((a, s) => a + Number(s.value || 0), 0))}{" "}
                  vendidos
                </small>
                {(ctx.role === "admin" || m.broker.id === ctx.userId) && (
                  <button
                    className="crm-link-button"
                    onClick={() => setEdit(m.broker)}
                  >
                    Editar perfil
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!metrics.length && (
          <div className="crm-panel">
            <Empty
              title="Perfil profissional não encontrado"
              description="Seu login está ativo, mas o cadastro de corretor ainda precisa ser vinculado pelo gestor."
            />
          </div>
        )}
        <Panel
          title="Produtividade comercial"
          description="Indicadores por corretor, calculados com os dados do período"
        >
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Corretor</th>
                  <th>Leads</th>
                  <th>Convertidos</th>
                  <th>Primeiros contatos</th>
                  <th>Retornos concluídos</th>
                  <th>Vendas</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.broker.id}>
                    <td>
                      <strong>{m.broker.name}</strong>
                    </td>
                    <td>{m.leads.length}</td>
                    <td>
                      {m.leads.filter((l) => l.status === "convertido").length}
                    </td>
                    <td>{m.leads.filter((l) => l.first_contact_at).length}</td>
                    <td>{m.tasks.length}</td>
                    <td>{m.sales.length}</td>
                    <td>
                      {money(
                        m.sales.reduce((a, s) => a + Number(s.value || 0), 0),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </SectionState>
      {edit && (
        <Modal
          title="Editar perfil profissional"
          description="As permissões de login não são alteradas aqui."
          onClose={() => setEdit(null)}
        >
          <EntityForm
            fields={fields}
            onClose={() => setEdit(null)}
            onSubmit={(f) =>
              ctx.run(() =>
                supabase
                  .from("brokers")
                  .update({
                    name: text(f, "name"),
                    phone: optional(f, "phone"),
                    creci: optional(f, "creci"),
                  })
                  .eq("id", edit.id)
                  .select("id")
                  .single(),
              )
            }
          />
        </Modal>
      )}
    </>
  );
}
