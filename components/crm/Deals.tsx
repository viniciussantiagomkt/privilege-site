"use client";
import { useState } from "react";
import { Handshake, FileText, Wallet, TrendingUp } from "lucide-react";
import { useWorkspace } from "./Workspace";
import { supabase } from "@/lib/supabase";
import {
  PageHeading,
  SectionState,
  NewButton,
  Metric,
  Empty,
  Badge,
  Modal,
  EntityForm,
  Button,
  text,
  optional,
  numberId,
  type Field,
} from "./UI";
import {
  money,
  matches,
  type Proposal,
  type Negotiation,
  type Sale,
} from "@/lib/crm/model";
export function Deals() {
  const ctx = useWorkspace();
  const [tab, setTab] = useState("proposals");
  const [form, setForm] = useState("");
  const [selected, setSelected] = useState<
    Proposal | Negotiation | Sale | null
  >(null);
  const [status, setStatus] = useState("");
  const proposals = ctx.data.proposals.filter(
    (p) =>
      matches(
        ctx.query,
        ctx.data.clients.find((c) => c.id === p.client_id)?.name,
        ctx.data.properties.find((i) => i.id === p.property_id)?.title,
        String(p.id),
      ) &&
      (!status || p.status === status),
  );
  const negotiations = ctx.data.negotiations.filter((n) => {
    const p = ctx.data.proposals.find((p) => p.id === n.proposal_id);
    return (
      matches(
        ctx.query,
        n.notes,
        String(n.id),
        ctx.data.clients.find((c) => c.id === p?.client_id)?.name,
      ) &&
      (!status || n.status === status)
    );
  });
  const sales = ctx.data.sales.filter((s) =>
    matches(
      ctx.query,
      ctx.data.clients.find((c) => c.id === s.client_id)?.name,
      ctx.data.properties.find((i) => i.id === s.property_id)?.title,
    ),
  );
  const proposalStatuses = [
    "rascunho",
    "enviada",
    "em_negociacao",
    "aceita",
    "recusada",
    "cancelada",
  ];
  const negotiationStatuses = ["aberta", "em_andamento", "ganha", "perdida"];
  const fields: Field[] =
    form === "negotiation"
      ? [
          {
            name: "proposal_id",
            label: "Proposta",
            required: true,
            value:
              selected && "proposal_id" in selected
                ? selected.proposal_id
                : null,
            options: ctx.data.proposals.map((p) => ({
              value: p.id,
              label: `#${p.id} · ${ctx.data.clients.find((c) => c.id === p.client_id)?.name || "Cliente"} · ${money(p.value)}`,
            })),
          },
          {
            name: "notes",
            label: "Condições da negociação",
            type: "textarea",
            value: selected && "notes" in selected ? selected.notes : null,
          },
        ]
      : [
          {
            name: "client_id",
            label: "Cliente",
            required: true,
            value:
              selected && "client_id" in selected ? selected.client_id : null,
            options: ctx.data.clients.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          },
          {
            name: "property_id",
            label: "Imóvel",
            required: true,
            value:
              selected && "property_id" in selected
                ? selected.property_id
                : null,
            options: ctx.data.properties.map((p) => ({
              value: p.id,
              label: `${p.property_code} · ${p.title}`,
            })),
          },
          {
            name: "value",
            label:
              form === "sale"
                ? "Valor da venda (R$)"
                : "Valor da proposta (R$)",
            type: "number",
            required: true,
            value: selected && "value" in selected ? selected.value : null,
          },
          ...(form === "sale"
            ? [
                {
                  name: "date",
                  label: "Data da venda",
                  type: "date",
                  required: true,
                  value: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
                },
              ]
            : []),
        ];
  if (ctx.operations && form !== "negotiation")
    fields.push({
      name: "broker_id",
      label: "Corretor responsável",
      required: true,
      value:
        selected && "broker_id" in selected ? selected.broker_id : ctx.userId,
      options: [
        ...ctx.data.brokers.map((b) => ({ value: b.id, label: b.name })),
        ...(!ctx.data.brokers.some((b) => b.id === ctx.userId)
          ? [{ value: ctx.userId, label: "Minha conta" }]
          : []),
      ],
    });
  async function save(f: FormData) {
    if (form === "negotiation") {
      const payload = {
        proposal_id: numberId(f, "proposal_id"),
        notes: optional(f, "notes"),
      };
      return ctx.run(() =>
        selected
          ? supabase
              .from("negotiations")
              .update(payload)
              .eq("id", selected.id)
              .select("id")
              .single()
          : supabase.from("negotiations").insert(payload).select("id").single(),
      );
    }
    const payload = {
      client_id: numberId(f, "client_id"),
      property_id: numberId(f, "property_id"),
      value: Number(text(f, "value")),
      broker_id: ctx.operations ? text(f, "broker_id") : ctx.userId,
      ...(form === "sale" ? { date: text(f, "date") } : {}),
    };
    const table = form === "sale" ? "sales" : "proposals";
    return ctx.run(
      () =>
        selected
          ? supabase
              .from(table)
              .update(payload)
              .eq("id", selected.id)
              .select("id")
              .single()
          : supabase.from(table).insert(payload).select("id").single(),
      "Registro comercial salvo.",
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="Fechamento de negócios"
        title="Propostas e vendas"
        description="Acompanhe condições, negociações e resultados até o fechamento."
        action={
          <>
            <Button
              secondary
              onClick={() => {
                setSelected(null);
                setForm("negotiation");
              }}
            >
              Abrir negociação
            </Button>
            <NewButton
              onClick={() => {
                setSelected(null);
                setForm(tab === "sales" ? "sale" : "proposal");
              }}
            >
              {tab === "sales" ? "Registrar venda" : "Nova proposta"}
            </NewButton>
          </>
        }
      />
      <div className="crm-metrics">
        <Metric
          label="Propostas abertas"
          value={
            ctx.data.proposals.filter((p) =>
              ["rascunho", "enviada", "em_negociacao"].includes(p.status),
            ).length
          }
          detail="Oportunidades com próximo passo"
          icon={<FileText size={18} />}
        />
        <Metric
          label="Volume proposto"
          value={money(
            ctx.data.proposals
              .filter((p) =>
                ["rascunho", "enviada", "em_negociacao"].includes(p.status),
              )
              .reduce((a, p) => a + Number(p.value || 0), 0),
          )}
          detail="Soma das propostas abertas"
          icon={<Wallet size={18} />}
        />
        <Metric
          label="Em negociação"
          value={
            ctx.data.negotiations.filter((n) =>
              ["aberta", "em_andamento"].includes(n.status),
            ).length
          }
          detail="Negociações em andamento"
          icon={<Handshake size={18} />}
        />
        <Metric
          label="Volume vendido"
          value={money(
            ctx.data.sales.reduce((a, s) => a + Number(s.value || 0), 0),
          )}
          detail={`${ctx.data.sales.length} vendas no seu escopo`}
          icon={<TrendingUp size={18} />}
        />
      </div>
      <div className="crm-tab-bar">
        <button
          className={tab === "proposals" ? "active" : ""}
          onClick={() => {
            setTab("proposals");
            setStatus("");
          }}
        >
          Propostas
        </button>
        <button
          className={tab === "negotiations" ? "active" : ""}
          onClick={() => {
            setTab("negotiations");
            setStatus("");
          }}
        >
          Negociações
        </button>
        <button
          className={tab === "sales" ? "active" : ""}
          onClick={() => {
            setTab("sales");
            setStatus("");
          }}
        >
          Vendas registradas
        </button>
      </div>
      {tab !== "sales" && (
        <div className="crm-toolbar">
          <select
            aria-label="Filtrar situação comercial"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todas as situações</option>
            {(tab === "proposals" ? proposalStatuses : negotiationStatuses).map(
              (s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ),
            )}
          </select>
        </div>
      )}
      <SectionState tables={["proposals", "negotiations", "sales"]}>
        <div className="crm-panel crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>{tab === "negotiations" ? "Negociação" : "Cliente"}</th>
                <th>Imóvel</th>
                <th>Valor</th>
                <th>{tab === "sales" ? "Venda em" : "Situação"}</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tab === "proposals"
                ? proposals.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>
                          {ctx.data.clients.find((c) => c.id === p.client_id)
                            ?.name || "Cliente"}
                        </strong>
                        <small>Proposta #{p.id}</small>
                      </td>
                      <td>
                        {ctx.data.properties.find((i) => i.id === p.property_id)
                          ?.title || "Imóvel"}
                      </td>
                      <td>{money(p.value)}</td>
                      <td>
                        <select
                          className="crm-compact-status"
                          aria-label={`Situação da proposta ${p.id}`}
                          value={p.status}
                          disabled={ctx.busy}
                          onChange={(e) =>
                            void ctx.run(() =>
                              supabase
                                .from("proposals")
                                .update({ status: e.target.value })
                                .eq("id", p.id)
                                .select("id")
                                .single(),
                            )
                          }
                        >
                          {proposalStatuses.map((s) => (
                            <option key={s} value={s}>
                              {s.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="crm-link-button"
                          onClick={() => {
                            setSelected(p);
                            setForm("proposal");
                          }}
                        >
                          Editar proposta
                        </button>
                      </td>
                    </tr>
                  ))
                : tab === "negotiations"
                  ? negotiations.map((n) => {
                      const p = ctx.data.proposals.find(
                        (p) => p.id === n.proposal_id,
                      );
                      return (
                        <tr key={n.id}>
                          <td>
                            <strong>Negociação #{n.id}</strong>
                            <small>
                              {ctx.data.clients.find(
                                (c) => c.id === p?.client_id,
                              )?.name || "Cliente"}
                            </small>
                          </td>
                          <td>
                            {ctx.data.properties.find(
                              (i) => i.id === p?.property_id,
                            )?.title || "Imóvel"}
                          </td>
                          <td>{money(p?.value)}</td>
                          <td>
                            <select
                              aria-label={`Situação da negociação ${n.id}`}
                              className="crm-compact-status"
                              value={n.status}
                              disabled={ctx.busy}
                              onChange={(e) =>
                                void ctx.run(() =>
                                  supabase
                                    .from("negotiations")
                                    .update({ status: e.target.value })
                                    .eq("id", n.id)
                                    .select("id")
                                    .single(),
                                )
                              }
                            >
                              {negotiationStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {s.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="crm-link-button"
                              onClick={() => {
                                setSelected(n);
                                setForm("negotiation");
                              }}
                            >
                              Condições
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  : sales.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>
                            {ctx.data.clients.find((c) => c.id === s.client_id)
                              ?.name || "Cliente"}
                          </strong>
                          <small>
                            {
                              ctx.data.brokers.find((b) => b.id === s.broker_id)
                                ?.name
                            }
                          </small>
                        </td>
                        <td>
                          {ctx.data.properties.find(
                            (p) => p.id === s.property_id,
                          )?.title || "Imóvel"}
                        </td>
                        <td>{money(s.value)}</td>
                        <td>
                          {new Date(s.date + "T12:00:00").toLocaleDateString(
                            "pt-BR",
                          )}
                        </td>
                        <td>
                          {ctx.operations ? (
                            <button
                              className="crm-link-button"
                              onClick={() => {
                                setSelected(s);
                                setForm("sale");
                              }}
                            >
                              Editar registro
                            </button>
                          ) : (
                            <Badge tone="green">Registrada</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
          {(tab === "proposals"
            ? !proposals.length
            : tab === "negotiations"
              ? !negotiations.length
              : !sales.length) && (
            <Empty
              title="Seu próximo negócio começa aqui"
              description="Cadastre uma proposta com cliente e imóvel para acompanhar o fechamento."
            />
          )}
        </div>
        {tab === "sales" && !ctx.operations && (
          <p className="crm-detail-pill">
            O registro de vendas é feito pelo gestor. Você acompanha aqui as
            vendas do seu portfólio.
          </p>
        )}
      </SectionState>
      {form && (
        <Modal
          title={`${selected ? "Editar" : "Nova"} ${form === "proposal" ? "proposta" : form === "negotiation" ? "negociação" : "venda"}`}
          description={
            form === "sale"
              ? "Registre apenas uma venda confirmada. Este registro não altera automaticamente o status do imóvel."
              : "Relacionamentos preservados e acesso controlado por perfil."
          }
          onClose={() => {
            setForm("");
            setSelected(null);
          }}
        >
          {form === "sale" && !ctx.operations ? (
            <Empty
              title="Acesso gerencial necessário"
              description="Peça ao gestor para registrar o fechamento."
            />
          ) : (
            <EntityForm
              fields={fields}
              onSubmit={save}
              onClose={() => {
                setForm("");
                setSelected(null);
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
}
