"use client";
import { useState } from "react";
import { Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sharePath, shareState, type Share } from "@/lib/crm/marketing";
import { dateTime, matches } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import {
  PageHeading,
  SectionState,
  Button,
  Badge,
  Empty,
  Panel,
  Modal,
} from "./UI";
import { ShareComposer } from "./ShareComposer";
export function Presentations() {
  const ctx = useWorkspace();
  const [create, setCreate] = useState(false);
  const [revoke, setRevoke] = useState<Share | null>(null);
  const [status, setStatus] = useState("");
  const shares = ctx.data.marketing_shares
    .filter(
      (s) =>
        matches(ctx.query, s.title, s.message) &&
        (!status || shareState(s) === status),
    )
    .slice()
    .reverse();
  return (
    <>
      <PageHeading
        eyebrow="Sua vitrine digital"
        title="Apresentações"
        description="Links personalizados, materiais aprovados e histórico de atendimento em um só lugar."
        action={
          <Button onClick={() => setCreate(true)}>
            <Link2 size={16} />
            Nova apresentação
          </Button>
        }
      />
      <div className="crm-toolbar">
        <select
          aria-label="Estado do link"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os links</option>
          {["Ativo", "Vencido", "Revogado"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <SectionState
        tables={[
          "marketing_shares",
          "marketing_share_events",
          "properties",
          "marketing_assets",
        ]}
      >
        <Panel
          title="Links e compartilhamentos"
          description="Os acessos representam aberturas com consentimento, não leitura completa."
        >
          {shares.length ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Apresentação</th>
                    <th>Atendimento</th>
                    <th>Validade</th>
                    <th>Acessos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.title}</strong>
                        <small>
                          {s.channel} · {dateTime(s.created_at)}
                        </small>
                        <Badge
                          tone={shareState(s) === "Ativo" ? "green" : "muted"}
                        >
                          {shareState(s)}
                        </Badge>
                      </td>
                      <td>
                        {ctx.data.leads.find((l) => l.id === s.lead_id)?.name ||
                          ctx.data.clients.find((c) => c.id === s.client_id)
                            ?.name ||
                          "Sem vínculo"}
                      </td>
                      <td>{dateTime(s.expires_at)}</td>
                      <td>
                        {
                          ctx.data.marketing_share_events.filter(
                            (e) => e.share_id === s.id,
                          ).length
                        }
                      </td>
                      <td>
                        <div className="crm-detail-actions">
                          <a
                            className="crm-button secondary"
                            target="_blank"
                            rel="noreferrer"
                            href={sharePath(s)}
                          >
                            Abrir
                          </a>
                          <Button
                            secondary
                            onClick={() =>
                              void ctx.run(async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `${s.message || ""}\n${window.location.origin}${sharePath(s)}`,
                                  );
                                  return { error: null };
                                } catch {
                                  return {
                                    error: {
                                      message:
                                        "Não foi possível copiar o link.",
                                    },
                                  };
                                }
                              }, "Mensagem e link copiados.")
                            }
                          >
                            Copiar
                          </Button>
                          <Button
                            secondary
                            disabled={ctx.busy}
                            onClick={() =>
                              void ctx.run(
                                () =>
                                  supabase.rpc(
                                    "crm_confirm_presentation_share",
                                    { target_share: s.id },
                                  ),
                                "Envio confirmado no atendimento.",
                              )
                            }
                          >
                            {ctx.data.crm_event_log.some(
                              (e) =>
                                e.entity_id === s.id &&
                                e.event_type === "presentation_shared",
                            )
                              ? "Envio confirmado"
                              : "Confirmar envio"}
                          </Button>
                          {shareState(s) === "Ativo" && (
                            <Button secondary onClick={() => setRevoke(s)}>
                              Revogar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Sua primeira apresentação começa aqui"
              description="Selecione um imóvel autorizado e gere um link para seu cliente."
            />
          )}
        </Panel>
      </SectionState>
      {create && <ShareComposer onClose={() => setCreate(false)} />}{" "}
      {revoke && (
        <Modal
          title="Revogar apresentação?"
          description="O link deixará de abrir para qualquer pessoa. Essa ação não pode ser desfeita."
          onClose={() => setRevoke(null)}
        >
          <Button
            disabled={ctx.busy}
            onClick={() =>
              void ctx
                .run(
                  () =>
                    supabase
                      .from("marketing_shares")
                      .update({ revoked_at: new Date().toISOString() })
                      .eq("id", revoke.id)
                      .select("id")
                      .single(),
                  "Link revogado.",
                )
                .then((ok) => {
                  if (ok) setRevoke(null);
                })
            }
          >
            Revogar link
          </Button>
        </Modal>
      )}
    </>
  );
}
