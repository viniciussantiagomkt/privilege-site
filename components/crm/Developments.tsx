"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Developer, Development } from "@/lib/crm/marketing";
import { useWorkspace } from "./Workspace";
import {
  PageHeading,
  SectionState,
  Panel,
  Badge,
  Empty,
  Button,
  Modal,
  EntityForm,
  text,
  optional,
  numberId,
  type Field,
} from "./UI";
export function Developments() {
  const ctx = useWorkspace();
  const [developer, setDeveloper] = useState<Developer | "new" | null>(null);
  const [development, setDevelopment] = useState<Development | "new" | null>(
    null,
  );
  const [unit, setUnit] = useState<number | null>(null);
  const d = developer && developer !== "new" ? developer : null;
  const e = development && development !== "new" ? development : null;
  const developerFields: Field[] = [
    { name: "name", label: "Nome", required: true, value: d?.name },
    { name: "website", label: "Site", type: "url", value: d?.website },
    { name: "contact_name", label: "Contato", value: d?.contact_name },
    { name: "phone", label: "Telefone", value: d?.phone },
    { name: "email", label: "E-mail", type: "email", value: d?.email },
    {
      name: "disclosure_rules",
      label: "Regras de divulgação",
      type: "textarea",
      value: d?.disclosure_rules,
    },
  ];
  const developmentFields: Field[] = [
    { name: "name", label: "Nome", required: true, value: e?.name },
    {
      name: "developer_id",
      label: "Construtora",
      value: e?.developer_id,
      options: ctx.data.developers.map((d) => ({ value: d.id, label: d.name })),
    },
    { name: "location", label: "Localização pública", value: e?.location },
    {
      name: "status",
      label: "Situação",
      required: true,
      value: e?.status || "planejamento",
      options: ["planejamento", "lancamento", "em obras", "entregue"].map(
        (s) => ({ value: s, label: s }),
      ),
    },
    {
      name: "delivery_date",
      label: "Previsão de entrega",
      type: "date",
      value: e?.delivery_date,
    },
    { name: "typologies", label: "Tipologias", value: e?.typologies },
    {
      name: "description",
      label: "Descrição",
      type: "textarea",
      value: e?.description,
    },
    {
      name: "sales_conditions",
      label: "Condições comerciais",
      type: "textarea",
      value: e?.sales_conditions,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Portfólio de empreendimentos"
        title="Construtoras e empreendimentos"
        description="Cadastre a origem dos materiais e vincule unidades sem duplicar os arquivos."
        action={
          ctx.operations ? (
            <>
              <Button secondary onClick={() => setDeveloper("new")}>
                Nova construtora
              </Button>
              <Button onClick={() => setDevelopment("new")}>
                Novo empreendimento
              </Button>
            </>
          ) : undefined
        }
      />
      <SectionState
        tables={["developers", "developments", "development_units"]}
      >
        <div className="crm-marketing-grid">
          {ctx.data.developers.map((d) => (
            <Panel
              key={d.id}
              title={d.name}
              description={d.contact_name || "Construtora"}
            >
              <div className="crm-panel-padding">
                <p>
                  {d.phone} {d.email}
                </p>
                <p>{d.disclosure_rules}</p>
                {ctx.operations && (
                  <Button secondary onClick={() => setDeveloper(d)}>
                    Editar construtora
                  </Button>
                )}
              </div>
            </Panel>
          ))}
        </div>
        <Panel title="Empreendimentos">
          {ctx.data.developments.length ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Empreendimento</th>
                    <th>Construtora</th>
                    <th>Situação</th>
                    <th>Unidades vinculadas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.data.developments.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                        <small>{d.location}</small>
                      </td>
                      <td>
                        {ctx.data.developers.find(
                          (c) => c.id === d.developer_id,
                        )?.name || "Não informada"}
                      </td>
                      <td>
                        <Badge>{d.status}</Badge>
                      </td>
                      <td>
                        {ctx.data.development_units
                          .filter((u) => u.development_id === d.id)
                          .map((u) => (
                            <div key={u.id}>
                              {u.unit_label} ·{" "}
                              {
                                ctx.data.properties.find(
                                  (p) => p.id === u.property_id,
                                )?.property_code
                              }
                              {ctx.operations && (
                                <button
                                  className="crm-link-button"
                                  disabled={ctx.busy}
                                  onClick={() =>
                                    void ctx.run(() =>
                                      supabase
                                        .from("development_units")
                                        .delete()
                                        .eq("id", u.id)
                                        .select("id")
                                        .single(),
                                    )
                                  }
                                >
                                  Desvincular
                                </button>
                              )}
                            </div>
                          ))}
                      </td>
                      <td>
                        {ctx.operations && (
                          <div className="crm-detail-actions">
                            <Button secondary onClick={() => setDevelopment(d)}>
                              Editar
                            </Button>
                            <Button secondary onClick={() => setUnit(d.id)}>
                              Vincular unidade
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Nenhum empreendimento cadastrado"
              description="A gestão pode organizar construtoras e unidades nesta área."
            />
          )}
        </Panel>
      </SectionState>
      {developer && (
        <Modal
          title={d ? "Editar construtora" : "Nova construtora"}
          onClose={() => setDeveloper(null)}
        >
          <EntityForm
            fields={developerFields}
            onClose={() => setDeveloper(null)}
            onSubmit={(f) => {
              const v = {
                name: text(f, "name"),
                website: optional(f, "website"),
                contact_name: optional(f, "contact_name"),
                phone: optional(f, "phone"),
                email: optional(f, "email"),
                disclosure_rules: optional(f, "disclosure_rules"),
              };
              return ctx.run(() =>
                d
                  ? supabase
                      .from("developers")
                      .update(v)
                      .eq("id", d.id)
                      .select("id")
                      .single()
                  : supabase.from("developers").insert(v),
              );
            }}
          />
        </Modal>
      )}
      {development && (
        <Modal
          title={e ? "Editar empreendimento" : "Novo empreendimento"}
          onClose={() => setDevelopment(null)}
          wide
        >
          <EntityForm
            fields={developmentFields}
            onClose={() => setDevelopment(null)}
            onSubmit={(f) => {
              const v = {
                name: text(f, "name"),
                developer_id: numberId(f, "developer_id"),
                location: optional(f, "location"),
                status: text(f, "status"),
                delivery_date: optional(f, "delivery_date"),
                typologies: optional(f, "typologies"),
                description: optional(f, "description"),
                sales_conditions: optional(f, "sales_conditions"),
              };
              return ctx.run(() =>
                e
                  ? supabase
                      .from("developments")
                      .update(v)
                      .eq("id", e.id)
                      .select("id")
                      .single()
                  : supabase.from("developments").insert(v),
              );
            }}
          />
        </Modal>
      )}
      {unit && (
        <Modal title="Vincular unidade" onClose={() => setUnit(null)}>
          <EntityForm
            fields={[
              {
                name: "property",
                label: "Imóvel",
                required: true,
                options: ctx.data.properties.map((p) => ({
                  value: p.id,
                  label: `${p.property_code} · ${p.title}`,
                })),
              },
              {
                name: "label",
                label: "Identificação da unidade",
                required: true,
              },
            ]}
            onClose={() => setUnit(null)}
            onSubmit={(f) =>
              ctx.run(() =>
                supabase
                  .from("development_units")
                  .insert({
                    development_id: unit,
                    property_id: numberId(f, "property"),
                    unit_label: text(f, "label"),
                  }),
              )
            }
          />
        </Modal>
      )}
    </>
  );
}
