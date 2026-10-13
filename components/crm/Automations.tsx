"use client";
import { supabase } from "@/lib/supabase";
import { dateTime } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import {
  PageHeading,
  SectionState,
  Panel,
  EntityForm,
  text,
  Badge,
  Empty,
} from "./UI";
export function Automations() {
  const ctx = useWorkspace();
  const pref = ctx.data.crm_automation_preferences.find(
    (p) => p.owner_id === ctx.userId,
  );
  return (
    <>
      <PageHeading
        eyebrow="Menos trabalho repetido"
        title="Automações"
        description="Organize os retornos automaticamente e acompanhe os eventos do CRM."
      />
      <SectionState tables={["crm_automation_preferences", "crm_event_log"]}>
        <Panel
          title="Retorno após gerar apresentação"
          description="Ao gerar um link vinculado a um lead, o CRM cria uma tarefa para você. Nenhuma mensagem externa é enviada."
        >
          <EntityForm
            key={`${pref?.share_followup}-${pref?.followup_days}`}
            fields={[
              {
                name: "enabled",
                label: "Retorno automático",
                required: true,
                value: pref?.share_followup ? "yes" : "no",
                options: [
                  { value: "no", label: "Desativado" },
                  { value: "yes", label: "Ativado" },
                ],
              },
              {
                name: "days",
                label: "Prazo do retorno",
                required: true,
                value: pref?.followup_days || 2,
                options: [1, 2, 3, 7, 15, 30].map((n) => ({
                  value: n,
                  label: `${n} dias`,
                })),
              },
            ]}
            onClose={() => {}}
            onSubmit={(f) =>
              ctx.run(
                () =>
                  supabase
                    .from("crm_automation_preferences")
                    .upsert({
                      owner_id: ctx.userId,
                      share_followup: text(f, "enabled") === "yes",
                      followup_days: Number(text(f, "days")),
                      updated_at: new Date().toISOString(),
                    }),
                "Preferência de automação salva.",
              )
            }
          />
        </Panel>
        <Panel
          title="Integrações externas"
          description="Conectores que dependem de credenciais e autorização próprias."
        >
          <div className="crm-detail-grid">
            {[
              "Google Drive",
              "WhatsApp Business Platform",
              "Meta Lead Ads",
              "Google Calendar",
            ].map((name) => (
              <div key={name}>
                <strong>{name}</strong>
                <Badge tone="amber">Não conectado</Badge>
                <p>Credenciais e integração ainda pendentes.</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Registro de eventos"
          description="Eventos internos persistidos com chave de idempotência."
        >
          {ctx.data.crm_event_log.length ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Registro</th>
                    <th>Estado</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.data.crm_event_log
                    .slice(-50)
                    .reverse()
                    .map((e) => (
                      <tr key={e.id}>
                        <td>{e.event_type}</td>
                        <td>#{e.entity_id}</td>
                        <td>
                          <Badge>{e.status}</Badge>
                        </td>
                        <td>{dateTime(e.created_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Nenhum evento ainda"
              description="Os eventos aparecerão ao utilizar as apresentações."
            />
          )}
        </Panel>
      </SectionState>
    </>
  );
}
