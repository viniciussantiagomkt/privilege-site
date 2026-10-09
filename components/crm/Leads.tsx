"use client";
import { useEffect, useState } from "react";
import {
  Columns3,
  List,
  Phone,
  MessageCircle,
  ArrowUpRight,
  UserRound,
  CalendarPlus,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "./Workspace";
import {
  PageHeading,
  SectionState,
  NewButton,
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
  STAGES,
  normalizeStage,
  matches,
  dateTime,
  initials,
  type Lead,
  type Activity,
} from "@/lib/crm/model";
export function Leads() {
  const ctx = useWorkspace();
  const [view, setView] = useState("kanban");
  const [stage, setStage] = useState("");
  const [broker, setBroker] = useState("");
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [create, setCreate] = useState(false);
  const [lost, setLost] = useState<Lead | null>(null);
  const [dragOver, setDragOver] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("lead");
    if (id) queueMicrotask(() => setSelected(Number(id)));
  }, []);
  const filtered = ctx.data.leads.filter(
    (l) =>
      matches(ctx.query, l.name, l.phone, l.email, l.property_title) &&
      (stage ? normalizeStage(l.status) === stage : true) &&
      (broker === "unassigned"
        ? !l.broker_id
        : broker
          ? l.broker_id === broker
          : true) &&
      (!source || l.source === source),
  );
  async function move(lead: Lead, status: string) {
    if (normalizeStage(lead.status) === status) return;
    if (status === "perdido") {
      setLost(lead);
      return;
    }
    await ctx.run(
      () =>
        supabase
          .from("leads")
          .update({ status })
          .eq("id", lead.id)
          .select("id")
          .single(),
      "Etapa do lead atualizada.",
    );
  }
  const fields: Field[] = [
    { name: "name", label: "Nome do lead", required: true },
    { name: "phone", label: "WhatsApp", type: "tel", required: true },
    { name: "email", label: "E-mail", type: "email" },
    {
      name: "source",
      label: "Origem",
      required: true,
      options: [
        "manual",
        "instagram",
        "whatsapp",
        "indicacao",
        "site",
        "trafego pago",
      ].map((s) => ({ value: s, label: s })),
    },
    {
      name: "property_id",
      label: "Imóvel de interesse",
      options: ctx.data.properties.map((p) => ({
        value: p.id,
        label: `${p.property_code} · ${p.title}`,
      })),
    },
    { name: "message", label: "Interesse e observações", type: "textarea" },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Relacionamento comercial"
        title="Leads e pipeline"
        description="Transforme oportunidades em conversas, visitas e negócios."
        action={
          <NewButton onClick={() => setCreate(true)}>Novo lead</NewButton>
        }
      />
      <div className="crm-toolbar">
        <select
          aria-label="Filtrar etapa"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar origem"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Todas as origens</option>
          {Array.from(new Set(ctx.data.leads.map((l) => l.source))).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {ctx.operations && (
          <select
            aria-label="Filtrar responsável"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            <option value="unassigned">Não atribuídos</option>
            {ctx.data.brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <span className="crm-detail-pill">{filtered.length} oportunidades</span>
        <div className="crm-view-toggle">
          <button
            aria-pressed={view === "kanban"}
            className={view === "kanban" ? "active" : ""}
            onClick={() => setView("kanban")}
          >
            <Columns3 size={15} />
            Kanban
          </button>
          <button
            aria-pressed={view === "list"}
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={15} />
            Lista
          </button>
        </div>
      </div>
      <SectionState tables={["leads", "brokers"]}>
        {view === "kanban" ? (
          <div className="crm-kanban">
            {STAGES.map((s) => (
              <section
                key={s.id}
                className="crm-kanban-column"
                style={
                  dragOver === s.id
                    ? { outline: "2px solid #72A3BF" }
                    : undefined
                }
                onDragOver={(e) => {
                  if (!ctx.busy) {
                    e.preventDefault();
                    setDragOver(s.id);
                  }
                }}
                onDragLeave={() => setDragOver("")}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver("");
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  const lead = filtered.find((l) => l.id === id);
                  if (lead && !ctx.busy) void move(lead, s.id);
                }}
              >
                <div className="crm-kanban-head">
                  <i style={{ background: s.color }} />
                  {s.label}
                  <b>
                    {
                      filtered.filter((l) => normalizeStage(l.status) === s.id)
                        .length
                    }
                  </b>
                </div>
                {filtered
                  .filter((l) => normalizeStage(l.status) === s.id)
                  .map((l) => (
                    <article
                      key={l.id}
                      className="crm-lead-card"
                      draggable={!ctx.busy}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(l.id))
                      }
                    >
                      <button onClick={() => setSelected(l.id)}>
                        {l.name}
                      </button>
                      <p>{l.property_title || "Interesse em imóvel"}</p>
                      <Badge tone="muted">{l.source}</Badge>
                      <div className="crm-card-footer">
                        <small>
                          {new Date(l.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </small>
                        <span
                          className="crm-mini-avatar"
                          title={
                            ctx.data.brokers.find((b) => b.id === l.broker_id)
                              ?.name || "Sem responsável"
                          }
                        >
                          {l.broker_id ? (
                            initials(
                              ctx.data.brokers.find((b) => b.id === l.broker_id)
                                ?.name || "Corretor",
                            )
                          ) : (
                            <UserRound size={12} />
                          )}
                        </span>
                      </div>
                      <select
                        aria-label={`Alterar etapa de ${l.name}`}
                        value={normalizeStage(l.status)}
                        disabled={ctx.busy}
                        onChange={(e) => void move(l, e.target.value)}
                      >
                        {STAGES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                {!filtered.some((l) => normalizeStage(l.status) === s.id) && (
                  <p className="crm-kanban-empty">Nenhum lead nesta etapa</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="crm-panel crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Origem</th>
                  <th>Etapa</th>
                  <th>Responsável</th>
                  <th>Recebido em</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <button
                        className="crm-link-button"
                        onClick={() => setSelected(l.id)}
                      >
                        <strong>{l.name}</strong>
                      </button>
                      <small>{l.phone || l.email || "Sem contato"}</small>
                    </td>
                    <td>{l.source}</td>
                    <td>
                      <Badge>{normalizeStage(l.status)}</Badge>
                    </td>
                    <td>
                      {ctx.data.brokers.find((b) => b.id === l.broker_id)
                        ?.name || "Não atribuído"}
                    </td>
                    <td>{dateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty
                title="Nenhum lead encontrado"
                description="Ajuste os filtros ou cadastre uma oportunidade."
              />
            )}
          </div>
        )}
      </SectionState>
      {create && (
        <Modal
          title="Nova oportunidade"
          description="Cadastre um atendimento real no seu portfólio."
          onClose={() => setCreate(false)}
        >
          <EntityForm
            fields={fields}
            onClose={() => setCreate(false)}
            onSubmit={(f) =>
              ctx.run(
                () =>
                  supabase
                    .from("leads")
                    .insert({
                      name: text(f, "name"),
                      phone: text(f, "phone"),
                      email: optional(f, "email"),
                      source: text(f, "source"),
                      message: optional(f, "message"),
                      property_id: numberId(f, "property_id"),
                      broker_id: ctx.userId,
                      origin_type: "personal",
                    })
                    .select("id")
                    .single(),
                "Lead cadastrado.",
              )
            }
          />
        </Modal>
      )}
      {lost && (
        <Modal
          title="Registrar perda"
          description={`Informe por que ${lost.name} não avançou.`}
          onClose={() => setLost(null)}
        >
          <EntityForm
            fields={[
              {
                name: "lost_reason",
                label: "Motivo da perda",
                required: true,
                type: "textarea",
              },
            ]}
            onClose={() => setLost(null)}
            onSubmit={(f) =>
              ctx.run(() =>
                supabase
                  .from("leads")
                  .update({
                    status: "perdido",
                    lost_reason: text(f, "lost_reason"),
                  })
                  .eq("id", lost.id)
                  .select("id")
                  .single(),
              )
            }
          />
        </Modal>
      )}
      {selected && ctx.data.leads.find((l) => l.id === selected) && (
        <LeadDetail
          lead={ctx.data.leads.find((l) => l.id === selected)!}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const ctx = useWorkspace();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState("");
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) setHistoryError(error.message);
      else {
        setHistoryError("");
        setActivities(data || []);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [lead.id, ctx.updatedAt]);
  const user = ctx.data.brokers.find((b) => b.id === lead.broker_id);
  const related = ctx.data.crm_contact_links.filter(
    (l) => l.lead_id === lead.id,
  );
  const phone = (lead.phone || "").replace(/\D/g, "");
  const linkedContact = related
    .map((l) => ctx.data.clients.find((c) => c.id === l.contact_id))
    .find(Boolean);
  const fields: Field[] =
    form === "assign"
      ? [
          {
            name: "broker_id",
            label: "Corretor responsável",
            required: true,
            options: ctx.data.brokers
              .filter((b) => b.active)
              .map((b) => ({ value: b.id, label: b.name })),
          },
          {
            name: "reason",
            label: "Motivo da atribuição",
            required: true,
            type: "textarea",
          },
        ]
      : form === "return"
        ? [
            {
              name: "title",
              label: "O que precisa ser feito?",
              required: true,
              value: `Retornar para ${lead.name}`,
            },
            {
              name: "due_at",
              label: "Data e horário",
              type: "datetime-local",
              required: true,
            },
          ]
        : [
            {
              name: "contact_id",
              label: "Cliente",
              required: true,
              options: ctx.data.clients.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            },
          ];
  return (
    <Modal
      title={lead.name}
      description={`Lead #${lead.id} · ${normalizeStage(lead.status)}`}
      onClose={onClose}
    >
      <div className="crm-detail-grid">
        <div>
          <small>Contato</small>
          <strong>{lead.phone || lead.email || "Não informado"}</strong>
        </div>
        <div>
          <small>Responsável</small>
          <strong>{user?.name || "Não atribuído"}</strong>
        </div>
        <div>
          <small>Interesse</small>
          <strong>
            {lead.property_title ||
              ctx.data.properties.find((p) => p.id === lead.property_id)
                ?.title ||
              "Não informado"}
          </strong>
        </div>
        <div>
          <small>Origem</small>
          <strong>
            {lead.source} · {dateTime(lead.created_at)}
          </strong>
        </div>
      </div>
      {lead.message && <p className="crm-detail-pill">{lead.message}</p>}
      <div className="crm-detail-actions">
        {phone && (
          <a
            className="crm-button"
            href={`https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        )}
        {lead.phone && (
          <a href={`tel:${phone}`} className="crm-button secondary">
            <Phone size={15} />
            Ligar
          </a>
        )}
        <Button
          secondary
          disabled={ctx.busy}
          onClick={() =>
            void ctx.run(
              () =>
                supabase.rpc("crm_record_contact", { target_lead: lead.id }),
              "Contato registrado.",
            )
          }
        >
          <CheckCheck size={15} />
          {lead.first_contact_at ? "Registrar contato" : "Primeiro contato"}
        </Button>
        <Button
          secondary
          onClick={() => setForm(form === "return" ? "" : "return")}
        >
          <CalendarPlus size={15} />
          Agendar retorno
        </Button>
        {ctx.operations && (
          <Button
            secondary
            onClick={() => setForm(form === "assign" ? "" : "assign")}
          >
            Atribuir corretor
          </Button>
        )}
        <Button secondary onClick={() => setEdit(!edit)}>
          Editar dados
        </Button>
      </div>
      {edit && (
        <EntityForm
          fields={[
            { name: "name", label: "Nome", required: true, value: lead.name },
            {
              name: "phone",
              label: "WhatsApp",
              type: "tel",
              value: lead.phone,
            },
            {
              name: "email",
              label: "E-mail",
              type: "email",
              value: lead.email,
            },
            {
              name: "notes",
              label: "Observações",
              type: "textarea",
              value: lead.notes,
            },
          ]}
          onClose={() => setEdit(false)}
          onSubmit={(f) =>
            ctx.run(() =>
              supabase
                .from("leads")
                .update({
                  name: text(f, "name"),
                  phone: optional(f, "phone"),
                  email: optional(f, "email"),
                  notes: optional(f, "notes"),
                })
                .eq("id", lead.id)
                .select("id")
                .single(),
            )
          }
        />
      )}
      {!linkedContact && (
        <Button
          secondary
          onClick={() => setForm(form === "contact" ? "" : "contact")}
        >
          Vincular cliente cadastrado
        </Button>
      )}
      {linkedContact && (
        <div className="crm-detail-pill">
          Cliente vinculado: {linkedContact.name}
        </div>
      )}
      {form && (
        <EntityForm
          fields={fields}
          onClose={() => setForm("")}
          onSubmit={(f) =>
            form === "assign"
              ? ctx.run(() =>
                  supabase.rpc("crm_assign_lead", {
                    target_lead: lead.id,
                    target_broker: text(f, "broker_id"),
                    assignment_reason: text(f, "reason"),
                  }),
                )
              : form === "return"
                ? ctx.run(() =>
                    supabase
                      .from("tasks")
                      .insert({
                        title: text(f, "title"),
                        due_at: new Date(text(f, "due_at")).toISOString(),
                        broker_id: lead.broker_id || ctx.userId,
                        lead_id: lead.id,
                      })
                      .select("id")
                      .single(),
                  )
                : ctx.run(() =>
                    supabase
                      .from("crm_contact_links")
                      .insert({
                        contact_id: numberId(f, "contact_id"),
                        lead_id: lead.id,
                        relation: "atendimento",
                      })
                      .select("id")
                      .single(),
                  )
          }
        />
      )}
      <h3 style={{ margin: "24px 0 12px" }}>Histórico e atividades</h3>
      <form
        className="crm-inline-note"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            note.trim() &&
            (await ctx.run(
              () =>
                supabase
                  .from("lead_activities")
                  .insert({
                    lead_id: lead.id,
                    user_id: ctx.userId,
                    type: "note",
                    description: note.trim(),
                  })
                  .select("id")
                  .single(),
              "Atividade registrada.",
            ))
          )
            setNote("");
        }}
      >
        <input
          aria-label="Nova atividade do lead"
          placeholder="Adicione uma observação ao atendimento..."
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" disabled={ctx.busy || !note.trim()}>
          <ArrowUpRight size={16} />
          Salvar
        </Button>
      </form>
      {historyError ? (
        <p role="alert" className="crm-alert">
          {historyError}
        </p>
      ) : activities.length ? (
        <div className="crm-timeline">
          {activities.map((a) => (
            <div key={a.id}>
              <small>{dateTime(a.created_at)}</small>
              <p>{a.description || a.type}</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="O histórico começa com o contato"
          description="Anotações e alterações do atendimento aparecerão aqui."
        />
      )}
    </Modal>
  );
}
