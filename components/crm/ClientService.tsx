"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  dateTime,
  money,
  type Contact,
  type CrmProperty,
  type Task,
  type Visit,
  type Proposal,
  type Negotiation,
} from "@/lib/crm/model";
import { sharePath, type Share } from "@/lib/crm/marketing";
import {
  MESSAGE_TEMPLATES,
  PURPOSES,
  serviceMessage,
  reviewedWhatsAppUrl,
  type MessageKind,
} from "@/lib/crm/quick-service";
import { workDestination } from "@/lib/crm/broker-workspace";
import { useWorkspace } from "./Workspace";
import { Badge, Button, Empty, Modal } from "./UI";
import { ClientEditor, quickServiceError } from "./ClientEditor";
import { AgendaEditor } from "./AgendaEditor";
import { TaskCompleteButton } from "./TaskCompleteButton";

type TimelineRow = { id: string; created_at: string; description: string };
type Resource =
  | "tasks"
  | "visits"
  | "proposals"
  | "negotiations"
  | "properties"
  | "marketing_shares"
  | "history"
  | "options";
type Resources = {
  tasks: Task[];
  visits: Visit[];
  proposals: Proposal[];
  negotiations: Negotiation[];
  properties: CrmProperty[];
  marketing_shares: Share[];
  history: TimelineRow[];
  options: CrmProperty[];
};

async function clientResource<K extends Resource>(
  kind: K,
  id: number,
  signal: AbortSignal,
  page = 0,
): Promise<Resources[K]> {
  if (kind === "history") {
    const result = await supabase
      .rpc("crm_client_timeline", { target_client: id, page_number: page })
      .abortSignal(signal);
    const error = quickServiceError(result.error);
    if (error) throw Error(error.message);
    return (result.data || []) as Resources[K];
  }
  if (kind === "properties") {
    const links = await supabase
      .from("crm_contact_links")
      .select("property_id")
      .eq("contact_id", id)
      .not("property_id", "is", null)
      .order("id")
      .range(0, 500)
      .abortSignal(signal);
    if (links.error || !links.data || links.data.length > 500)
      throw Error("Não foi possível carregar os vínculos deste cliente.");
    const ids = [...new Set(links.data.map((l) => l.property_id as number))];
    if (!ids.length) return [] as Resources[K];
    const result = await supabase
      .from("properties")
      .select("*")
      .in("id", ids)
      .is("deleted_at", null)
      .order("id")
      .range(0, 500)
      .abortSignal(signal);
    if (result.error || !result.data || result.data.length > 500)
      throw Error("Imóveis relacionados indisponíveis.");
    return result.data as Resources[K];
  }
  if (kind === "negotiations") {
    const proposals = await clientResource("proposals", id, signal);
    if (!proposals.length) return [] as Resources[K];
    const result = await supabase
      .from("negotiations")
      .select("*")
      .in(
        "proposal_id",
        proposals.map((p) => p.id),
      )
      .order("id")
      .range(0, 500)
      .abortSignal(signal);
    if (result.error || !result.data || result.data.length > 500)
      throw Error("Negociações indisponíveis.");
    return result.data as Resources[K];
  }
  let query =
    kind === "options"
      ? supabase.from("properties").select("*").is("deleted_at", null)
      : supabase.from(kind).select("*").eq("client_id", id);
  if (kind === "tasks") query = query.is("deleted_at", null);
  const result = await query.order("id").range(0, 500).abortSignal(signal);
  if (result.error || !result.data)
    throw Error("Não foi possível carregar esta seção. Tente novamente.");
  if (result.data.length > 500)
    throw Error(
      "Esta seção excedeu 500 registros. Consulte a tela especializada.",
    );
  return result.data as Resources[K];
}

// Requests are opt-in, bounded and abortable; the existing Workspace remains the only session/listener owner.
function ResourceSection<K extends Resource>({
  kind,
  clientId,
  title,
  children,
}: {
  kind: K;
  clientId: number;
  title: string;
  children: (rows: Resources[K]) => ReactNode;
}) {
  const ctx = useWorkspace();
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(0),
    [retry, setRetry] = useState(0);
  const scope = `${ctx.userId}:${clientId}:${ctx.updatedAt}:${page}:${retry}`;
  const [result, setResult] = useState<{
    scope: string;
    rows?: Resources[K];
    error?: string;
  }>();
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void clientResource(kind, clientId, controller.signal, page).then(
      (rows) => {
        if (!controller.signal.aborted) setResult({ scope, rows });
      },
      (e) => {
        if (!controller.signal.aborted)
          setResult({
            scope,
            error: e instanceof Error ? e.message : "Seção indisponível.",
          });
      },
    );
    return () => controller.abort();
  }, [open, kind, clientId, page, scope]);
  const current = result?.scope === scope ? result : undefined;
  return (
    <details
      className="crm-service-section"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{title}</summary>
      {open &&
        (!current ? (
          <p role="status">Carregando…</p>
        ) : current.error ? (
          <div role="alert">
            <p>{current.error}</p>
            <Button secondary onClick={() => setRetry((r) => r + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : current.rows?.length ? (
          <>
            {children(
              (kind === "history"
                ? current.rows.slice(0, 50)
                : current.rows) as Resources[K],
            )}
          </>
        ) : (
          <Empty
            title="Nenhum registro nesta seção"
            description="Somente os dados autorizados deste cliente aparecem aqui."
          />
        ))}
      {open && kind === "history" && current?.rows && (
        <div className="crm-form-actions">
          <Button
            secondary
            disabled={!page}
            onClick={() => setPage((p) => p - 1)}
          >
            Mais recentes
          </Button>
          <span>Página {page + 1}</span>
          <Button
            secondary
            disabled={current.rows.length <= 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Mais antigos
          </Button>
        </div>
      )}
    </details>
  );
}

export function ClientServiceDrawer({
  clientId,
  onClose,
  onSelect,
}: {
  clientId?: number;
  onClose: () => void;
  onSelect: (id: number) => void;
}) {
  const ctx = useWorkspace();
  const client = ctx.data.clients.find((c) => c.id === clientId);
  const [mode, setMode] = useState<
    "view" | "edit" | "task" | "visit" | "message"
  >(clientId ? "view" : "edit");
  const dirty = useRef(false);
  const contactAction = useRef<string | null>(null);
  function leave(next?: typeof mode) {
    if (ctx.busy) return;
    if (
      dirty.current &&
      !window.confirm("Descartar as alterações ainda não salvas?")
    )
      return;
    dirty.current = false;
    if (next) setMode(next);
    else onClose();
  }
  if (
    clientId &&
    (!client ||
      client.broker_id !== ctx.userId ||
      ctx.errors.clients ||
      ctx.errors.session)
  )
    return (
      <Modal side title="Atendimento indisponível" onClose={onClose}>
        <p>Reabra Atendimentos para conferir sua carteira autorizada.</p>
      </Modal>
    );
  return (
    <Modal
      side
      title={client?.name || "Novo cliente"}
      description={
        mode === "view"
          ? "Atendimento na sua carteira"
          : "Revise antes de confirmar"
      }
      onClose={() => leave()}
    >
      {mode === "edit" ? (
        <ClientEditor
          key={client?.id || "new"}
          contact={client}
          onDirty={() => {
            dirty.current = true;
          }}
          onCancel={() => (client ? leave("view") : leave())}
          onExisting={(id) => {
            if (
              dirty.current &&
              !window.confirm(
                "Abrir o cadastro existente e descartar este rascunho?",
              )
            )
              return;
            dirty.current = false;
            onSelect(id);
            setMode("view");
          }}
          onSaved={(id) => {
            dirty.current = false;
            onSelect(id);
            setMode("view");
          }}
        />
      ) : (
        client && (
          <>
            {mode !== "view" && (
              <Button secondary onClick={() => leave("view")}>
                Voltar ao cliente
              </Button>
            )}
            {mode === "message" ? (
              <ClientMessage
                client={client}
                onDirty={() => {
                  dirty.current = true;
                }}
              />
            ) : mode === "task" || mode === "visit" ? (
              <ClientAgenda
                client={client}
                mode={mode}
                onDirty={() => {
                  dirty.current = true;
                }}
                onClose={() => {
                  dirty.current = false;
                  setMode("view");
                }}
                onCancel={() => leave("view")}
              />
            ) : (
              <>
                <p className="crm-work-detail">
                  {client.phone || "WhatsApp não informado"}
                  <br />
                  {client.email}
                </p>
                <div className="crm-service-actions">
                  <Button onClick={() => setMode("message")}>
                    Preparar WhatsApp
                  </Button>
                  <Button secondary onClick={() => setMode("edit")}>
                    Editar cliente
                  </Button>
                </div>
                <details className="crm-service-section">
                  <summary>Próximo passo</summary>
                  <div className="crm-service-actions">
                    <Button secondary onClick={() => setMode("task")}>
                      Agendar retorno
                    </Button>
                    <Button secondary onClick={() => setMode("visit")}>
                      Agendar visita
                    </Button>
                    <Button
                      secondary
                      disabled={ctx.busy}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Confirma que o contato com este cliente foi realizado? Abrir o WhatsApp não comprova contato.",
                          )
                        )
                          return;
                        contactAction.current ??= crypto.randomUUID();
                        const ok = await ctx.run(async () => {
                          const r = await supabase.rpc(
                            "crm_record_client_contact",
                            {
                              target_client: client.id,
                              action_id: contactAction.current,
                            },
                          );
                          return { error: quickServiceError(r.error) };
                        }, "Contato realizado registrado.");
                        if (ok) contactAction.current = null;
                      }}
                    >
                      Registrar contato realizado
                    </Button>
                  </div>
                </details>
                <details className="crm-service-section">
                  <summary>Dados e interesse imobiliário</summary>
                  <InterestSummary client={client} />
                  {client.notes && (
                    <p className="crm-work-detail">{client.notes}</p>
                  )}
                </details>
                <ResourceSection
                  kind="history"
                  title="Histórico de atividades"
                  clientId={client.id}
                >
                  {(rows) => (
                    <ol className="crm-service-history">
                      {rows.map((r) => (
                        <li key={r.id}>
                          <strong>{r.description}</strong>
                          <small>{dateTime(r.created_at)}</small>
                        </li>
                      ))}
                    </ol>
                  )}
                </ResourceSection>
                <ResourceSection
                  kind="properties"
                  title="Imóveis relacionados"
                  clientId={client.id}
                >
                  {(rows) =>
                    rows.map((p) => (
                      <Link
                        className="crm-list-row"
                        key={p.id}
                        href={workDestination("property", p.id)}
                      >
                        {p.property_code} · {p.title}
                      </Link>
                    ))
                  }
                </ResourceSection>
                <ResourceSection
                  kind="tasks"
                  title="Tarefas e retornos"
                  clientId={client.id}
                >
                  {(rows) =>
                    rows.map((t) => (
                      <div className="crm-list-row" key={t.id}>
                        <div>
                          <strong>{t.title}</strong>
                          <small>
                            {dateTime(t.due_at)} · {t.status}
                          </small>
                        </div>
                        <TaskCompleteButton task={t} />
                      </div>
                    ))
                  }
                </ResourceSection>
                <ResourceSection
                  kind="visits"
                  title="Visitas"
                  clientId={client.id}
                >
                  {(rows) =>
                    rows.map((v) => (
                      <div className="crm-list-row" key={v.id}>
                        <span>{dateTime(v.scheduled_at)}</span>
                        <Badge>{v.status}</Badge>
                      </div>
                    ))
                  }
                </ResourceSection>
                <ResourceSection
                  kind="proposals"
                  title="Propostas autorizadas"
                  clientId={client.id}
                >
                  {(rows) =>
                    rows.map((p) => (
                      <Link
                        className="crm-list-row"
                        key={p.id}
                        href={workDestination("proposal", p.id)}
                      >
                        Proposta #{p.id} · {money(p.value)} · {p.status}
                      </Link>
                    ))
                  }
                </ResourceSection>
                <ResourceSection
                  kind="negotiations"
                  title="Negociações autorizadas"
                  clientId={client.id}
                >
                  {(rows) =>
                    rows.map((n) => (
                      <div className="crm-list-row" key={n.id}>
                        <span>Negociação #{n.id}</span>
                        <Badge>{n.status}</Badge>
                      </div>
                    ))
                  }
                </ResourceSection>
                <ResourceSection
                  kind="marketing_shares"
                  title="Apresentações vinculadas"
                  clientId={client.id}
                >
                  {(rows) =>
                    rows.map((s) => (
                      <div className="crm-list-row" key={s.id}>
                        <span>{s.title}</span>
                        <span>
                          {s.revoked_at ||
                          new Date(s.expires_at) < new Date() ? (
                            "Indisponível"
                          ) : (
                            <Link
                              href={sharePath(s)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir apresentação
                            </Link>
                          )}
                        </span>
                      </div>
                    ))
                  }
                </ResourceSection>
                <Link className="crm-link-button" href="/admin/apresentacoes">
                  Gerenciar apresentações existentes
                </Link>
              </>
            )}
          </>
        )
      )}
    </Modal>
  );
}

function InterestSummary({ client }: { client: Contact }) {
  const p = client.interest_profile || {};
  const labels: Record<string, string> = {
    purpose: "Finalidade",
    property_type: "Tipo",
    city: "Cidade",
    neighborhoods: "Bairros",
    budget_min: "Orçamento mínimo",
    budget_max: "Orçamento máximo",
    bedrooms: "Quartos",
    parking_spaces: "Vagas",
    preferences: "Preferências",
    payment_method: "Pagamento",
    financing: "Interesse em financiamento",
    down_payment: "Entrada informada voluntariamente",
  };
  const values: Record<string, string> = {
    ...PURPOSES,
    apartamento: "Apartamento",
    casa: "Casa",
    condominio: "Condomínio",
    terreno: "Terreno",
    comercial: "Comercial",
    outro: "Outro",
    a_vista: "À vista",
    financiamento: "Financiamento",
    consorcio: "Consórcio",
    indefinido: "A definir",
  };
  return Object.keys(p).length ? (
    <dl className="crm-service-profile">
      {Object.entries(p).map(([k, v]) => (
        <div key={k}>
          <dt>{labels[k] || k}</dt>
          <dd>
            {typeof v === "boolean"
              ? v
                ? "Sim"
                : "Não"
              : Array.isArray(v)
                ? v.join(", ")
                : ["budget_min", "budget_max", "down_payment"].includes(k)
                  ? money(String(v))
                  : values[String(v)] || String(v)}
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <p>Perfil ainda não preenchido. Use Editar cliente para completar.</p>
  );
}
function ClientAgenda({
  client,
  mode,
  onClose,
  onCancel,
  onDirty,
}: {
  client: Contact;
  mode: string;
  onClose: () => void;
  onCancel: () => void;
  onDirty: () => void;
}) {
  const [options, setOptions] = useState<CrmProperty[] | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void clientResource("options", client.id, controller.signal).then(
      (rows) => {
        if (!controller.signal.aborted) {
          setOptions(rows);
          setError(false);
        }
      },
      () => {
        if (!controller.signal.aborted) setError(true);
      },
    );
    return () => controller.abort();
  }, [client.id, retry]);
  return error ? (
    <div role="alert">
      <p>Não foi possível carregar os imóveis autorizados.</p>
      <Button secondary onClick={() => setRetry((r) => r + 1)}>
        Tentar novamente
      </Button>
    </div>
  ) : !options ? (
    <p role="status">Carregando opções autorizadas…</p>
  ) : (
    <AgendaEditor
      mode={mode}
      clientSeed={client.id}
      properties={options}
      onClose={onClose}
      onCancel={onCancel}
      onDirty={onDirty}
    />
  );
}
function ClientMessage({
  client,
  onDirty,
}: {
  client: Contact;
  onDirty: () => void;
}) {
  const ctx = useWorkspace();
  const broker = ctx.data.brokers.find((b) => b.id === ctx.userId);
  const [kind, setKind] = useState<MessageKind>("first");
  const [property, setProperty] = useState(""),
    [visit, setVisit] = useState(""),
    [share, setShare] = useState("");
  const [options, setOptions] = useState<{
      properties: CrmProperty[];
      visits: Visit[];
      shares: Share[];
    } | null>(null),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  const [message, setMessage] = useState(() =>
    serviceMessage("first", { name: client.name, broker: broker?.name }),
  );
  const [reviewed, setReviewed] = useState(false),
    [copy, setCopy] = useState("");
  useEffect(() => {
    const c = new AbortController();
    void Promise.all([
      clientResource("properties", client.id, c.signal),
      clientResource("visits", client.id, c.signal),
      clientResource("marketing_shares", client.id, c.signal),
    ]).then(
      ([properties, visits, shares]) => {
        if (!c.signal.aborted) {
          setOptions({
            properties,
            visits,
            shares: shares.filter(
              (s) => !s.revoked_at && new Date(s.expires_at) > new Date(),
            ),
          });
          setFailed(false);
        }
      },
      () => {
        if (!c.signal.aborted) setFailed(true);
      },
    );
    return () => c.abort();
  }, [client.id, retry]);
  function fill() {
    const p = options?.properties.find((p) => String(p.id) === property),
      v = options?.visits.find((v) => String(v.id) === visit),
      s = options?.shares.find((s) => String(s.id) === share);
    setMessage(
      serviceMessage(kind, {
        name: client.name,
        broker: broker?.name,
        property: p?.title,
        code: p?.property_code,
        date: v ? dateTime(v.scheduled_at) : undefined,
        presentationUrl: s
          ? `${window.location.origin}${sharePath(s)}`
          : undefined,
      }),
    );
    setReviewed(false);
    onDirty();
  }
  let url = "";
  try {
    if (client.phone && reviewed)
      url = reviewedWhatsAppUrl(client.phone, message);
  } catch {
    /* Invalid or legacy phone is shown below, never opened. */
  }
  return (
    <div className="crm-form crm-message-editor">
      <p>
        Responsável: {broker?.name || "Sua conta"}
        {broker?.phone
          ? ` · ${broker.phone}`
          : " · número profissional não cadastrado"}
        .
      </p>
      <p>
        Abra na conta profissional do corretor. O WhatsApp usa a conta conectada
        no seu aparelho; o site não escolhe o remetente. Abrir ou copiar não
        registra contato realizado.
      </p>
      <label>
        Modelo
        <select
          value={kind}
          aria-label="Modelo"
          onChange={(e) => {
            setKind(e.target.value as MessageKind);
            setReviewed(false);
          }}
        >
          {Object.entries(MESSAGE_TEMPLATES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {failed ? (
        <div role="alert">
          <p>
            Contextos indisponíveis. A mensagem pode ser editada manualmente.
          </p>
          <Button secondary onClick={() => setRetry((r) => r + 1)}>
            Tentar carregar contexto
          </Button>
        </div>
      ) : !options ? (
        <p role="status">Carregando contexto autorizado…</p>
      ) : (
        <>
          <label>
            Imóvel relacionado
            <select
              value={property}
              aria-label="Imóvel relacionado"
              onChange={(e) => {
                setProperty(e.target.value);
                setReviewed(false);
              }}
            >
              <option value="">Sem imóvel selecionado</option>
              {options.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_code} · {p.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visita vinculada
            <select
              value={visit}
              aria-label="Visita vinculada"
              onChange={(e) => {
                setVisit(e.target.value);
                setReviewed(false);
              }}
            >
              <option value="">Sem visita selecionada</option>
              {options.visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {dateTime(v.scheduled_at)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Apresentação autorizada
            <select
              value={share}
              aria-label="Apresentação autorizada"
              onChange={(e) => {
                setShare(e.target.value);
                setReviewed(false);
              }}
            >
              <option value="">Sem apresentação selecionada</option>
              {options.shares.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <Button secondary onClick={fill}>
        Preencher modelo selecionado
      </Button>
      <label>
        Mensagem para revisão
        <textarea
          rows={9}
          value={message}
          maxLength={3000}
          onChange={(e) => {
            setMessage(e.target.value);
            setReviewed(false);
            setCopy("");
            onDirty();
          }}
        />
      </label>
      <label className="crm-service-check">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        Revisei o destinatário e a mensagem.
      </label>
      <p>
        Destinatário: {client.name} · {client.phone || "WhatsApp não informado"}
      </p>
      <div className="crm-service-actions">
        <Button
          secondary
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              setCopy("Mensagem copiada. O envio não foi registrado.");
            } catch {
              setCopy(
                "Não foi possível copiar. Selecione o texto manualmente.",
              );
            }
          }}
        >
          Copiar mensagem
        </Button>
        {url ? (
          <a className="crm-button" href={url} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </a>
        ) : (
          <span>
            Revise a mensagem e informe um WhatsApp válido para continuar.
          </span>
        )}
      </div>
      <p role="status">{copy}</p>
    </div>
  );
}
