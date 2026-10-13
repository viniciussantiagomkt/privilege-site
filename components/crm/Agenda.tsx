"use client";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import { useWorkspace } from "./Workspace";
import { supabase } from "@/lib/supabase";
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
import { matches, dateTime, type Task, type Visit } from "@/lib/crm/model";
const localDate = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function Agenda() {
  const ctx = useWorkspace();
  const [tab, setTab] = useState("calendar");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [mode, setMode] = useState("");
  const [editing, setEditing] = useState<Task | Visit | null>(null);
  const [filter, setFilter] = useState("pending");
  const taskRows = ctx.data.tasks.filter(
    (t) =>
      matches(ctx.query, t.title, t.description) &&
      (filter === "all" || t.status !== "concluida"),
  );
  const visitRows = ctx.data.visits.filter(
    (v) =>
      matches(
        ctx.query,
        v.notes,
        ctx.data.clients.find((c) => c.id === v.client_id)?.name,
        ctx.data.properties.find((p) => p.id === v.property_id)?.title,
      ) &&
      (filter === "all" || !["realizada", "cancelada"].includes(v.status)),
  );
  const events = [
    ...taskRows.map((t) => ({
      id: `t${t.id}`,
      date: t.due_at,
      title: t.title,
      type: "task",
      row: t,
    })),
    ...visitRows.map((v) => ({
      id: `v${v.id}`,
      date: v.scheduled_at,
      title: `Visita · ${ctx.data.clients.find((c) => c.id === v.client_id)?.name || "Cliente"}`,
      type: "visit",
      row: v,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const days = Array.from(
    { length: 42 },
    (_, i) =>
      new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay() + i),
  );
  const today = new Date().toDateString();
  const isTask = mode === "task";
  const fields: Field[] = isTask
    ? [
        {
          name: "title",
          label: "Tarefa / retorno",
          required: true,
          value: editing && "title" in editing ? editing.title : "",
        },
        {
          name: "due_at",
          label: "Data e horário",
          type: "datetime-local",
          required: true,
          value:
            editing && "due_at" in editing ? localDate(editing.due_at) : "",
        },
        {
          name: "lead_id",
          label: "Lead relacionado",
          value: editing && "lead_id" in editing ? editing.lead_id : null,
          options: ctx.data.leads.map((l) => ({ value: l.id, label: l.name })),
        },
        {
          name: "client_id",
          label: "Cliente",
          value: editing?.client_id,
          options: ctx.data.clients.map((c) => ({
            value: c.id,
            label: c.name,
          })),
        },
        {
          name: "property_id",
          label: "Imóvel",
          value: editing?.property_id,
          options: ctx.data.properties.map((p) => ({
            value: p.id,
            label: p.title,
          })),
        },
        {
          name: "description",
          label: "Detalhes",
          type: "textarea",
          value: editing && "description" in editing ? editing.description : "",
        },
      ]
    : [
        {
          name: "client_id",
          label: "Cliente",
          required: true,
          value: editing?.client_id,
          options: ctx.data.clients.map((c) => ({
            value: c.id,
            label: c.name,
          })),
        },
        {
          name: "property_id",
          label: "Imóvel",
          required: true,
          value: editing?.property_id,
          options: ctx.data.properties.map((p) => ({
            value: p.id,
            label: `${p.property_code} · ${p.title}`,
          })),
        },
        {
          name: "scheduled_at",
          label: "Data e horário",
          type: "datetime-local",
          required: true,
          value:
            editing && "scheduled_at" in editing
              ? localDate(editing.scheduled_at)
              : "",
        },
        {
          name: "notes",
          label: "Observações",
          type: "textarea",
          value: editing && "notes" in editing ? editing.notes : "",
        },
      ];
  if (ctx.operations)
    fields.push({
      name: "broker_id",
      label: "Responsável",
      required: true,
      value: editing?.broker_id || ctx.userId,
      options: [
        ...ctx.data.brokers.map((b) => ({ value: b.id, label: b.name })),
        ...(!ctx.data.brokers.some((b) => b.id === ctx.userId)
          ? [{ value: ctx.userId, label: "Minha conta" }]
          : []),
      ],
    });
  async function save(f: FormData) {
    const selectedLead = ctx.data.leads.find(
      (l) => l.id === numberId(f, "lead_id"),
    );
    const brokerId = ctx.operations ? text(f, "broker_id") : ctx.userId;
    const payload: Record<string, unknown> = isTask
      ? {
          title: text(f, "title"),
          due_at: new Date(text(f, "due_at")).toISOString(),
          lead_id: numberId(f, "lead_id"),
          client_id: numberId(f, "client_id"),
          property_id: numberId(f, "property_id"),
          description: optional(f, "description"),
          broker_id: selectedLead?.broker_id || brokerId,
        }
      : {
          client_id: numberId(f, "client_id"),
          property_id: numberId(f, "property_id"),
          scheduled_at: new Date(text(f, "scheduled_at")).toISOString(),
          notes: optional(f, "notes"),
          broker_id: brokerId,
        };
    const table = isTask ? "tasks" : "visits";
    return ctx.run(
      () =>
        editing
          ? supabase
              .from(table)
              .update(payload)
              .eq("id", editing.id)
              .select("id")
              .single()
          : supabase.from(table).insert(payload).select("id").single(),
      "Agenda atualizada.",
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="Organização do atendimento"
        title="Agenda e tarefas"
        description="Cada visita, retorno e compromisso no seu devido lugar."
        action={
          <>
            <Button
              secondary
              onClick={() => {
                setEditing(null);
                setMode("task");
              }}
            >
              Nova tarefa
            </Button>
            <NewButton
              onClick={() => {
                setEditing(null);
                setMode("visit");
              }}
            >
              Agendar visita
            </NewButton>
          </>
        }
      />
      <div className="crm-toolbar">
        <select
          aria-label="Filtrar compromissos"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="pending">Pendentes</option>
          <option value="all">Todos os registros</option>
        </select>
        <div className="crm-view-toggle">
          <button
            className={tab === "calendar" ? "active" : ""}
            onClick={() => setTab("calendar")}
          >
            <CalendarDays size={15} />
            Calendário
          </button>
          <button
            className={tab === "tasks" ? "active" : ""}
            onClick={() => setTab("tasks")}
          >
            <Check size={15} />
            Tarefas
          </button>
          <button
            className={tab === "visits" ? "active" : ""}
            onClick={() => setTab("visits")}
          >
            <List size={15} />
            Visitas
          </button>
        </div>
      </div>
      <SectionState tables={["tasks", "visits"]}>
        {tab === "calendar" ? (
          <section className="crm-panel">
            <div className="crm-panel-head">
              <h2 style={{ textTransform: "capitalize" }}>
                {month.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="crm-calendar-controls">
                <button
                  className="crm-icon-button"
                  aria-label="Mês anterior"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft size={17} />
                </button>
                <Button
                  secondary
                  onClick={() =>
                    setMonth(
                      new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1,
                      ),
                    )
                  }
                >
                  Hoje
                </Button>
                <button
                  className="crm-icon-button"
                  aria-label="Próximo mês"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
            <div className="crm-calendar-grid">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div className="crm-calendar-weekday" key={d}>
                  {d}
                </div>
              ))}
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className={`crm-calendar-day ${d.getMonth() !== month.getMonth() ? "outside" : ""} ${d.toDateString() === today ? "today" : ""}`}
                >
                  <strong>{d.getDate()}</strong>
                  {events
                    .filter(
                      (e) =>
                        new Date(e.date).toDateString() === d.toDateString(),
                    )
                    .map((e) => (
                      <button
                        key={e.id}
                        title={`${dateTime(e.date)} · ${e.title}`}
                        onClick={() => {
                          setMode(e.type);
                          setEditing(e.row);
                        }}
                      >
                        {new Date(e.date).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {e.title}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="crm-panel crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>{tab === "tasks" ? "Tarefa" : "Cliente / imóvel"}</th>
                  <th>Data e horário</th>
                  <th>Responsável</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tab === "tasks"
                  ? taskRows
                      .slice()
                      .sort((a, b) => a.due_at.localeCompare(b.due_at))
                      .map((t) => (
                        <tr key={t.id}>
                          <td>
                            <button
                              className="crm-link-button"
                              onClick={() => {
                                setMode("task");
                                setEditing(t);
                              }}
                            >
                              <strong>{t.title}</strong>
                            </button>
                            <small>{t.description}</small>
                          </td>
                          <td>
                            {dateTime(t.due_at)}
                            {new Date(t.due_at) < new Date() &&
                              t.status !== "concluida" && (
                                <small style={{ color: "#b66c65" }}>
                                  Prazo vencido
                                </small>
                              )}
                          </td>
                          <td>
                            {ctx.data.brokers.find((b) => b.id === t.broker_id)
                              ?.name || "Minha conta"}
                          </td>
                          <td>
                            <Badge
                              tone={
                                t.status === "concluida" ? "green" : "amber"
                              }
                            >
                              {t.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              secondary
                              disabled={ctx.busy || t.status === "concluida"}
                              onClick={() =>
                                void ctx.run(() =>
                                  supabase
                                    .from("tasks")
                                    .update({ status: "concluida" })
                                    .eq("id", t.id)
                                    .select("id")
                                    .single(),
                                )
                              }
                            >
                              <Check size={14} />
                              Concluir
                            </Button>
                          </td>
                        </tr>
                      ))
                  : visitRows.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <button
                            className="crm-link-button"
                            onClick={() => {
                              setMode("visit");
                              setEditing(v);
                            }}
                          >
                            <strong>
                              {ctx.data.clients.find(
                                (c) => c.id === v.client_id,
                              )?.name || "Cliente"}
                            </strong>
                          </button>
                          <small>
                            {ctx.data.properties.find(
                              (p) => p.id === v.property_id,
                            )?.title || "Imóvel"}
                          </small>
                        </td>
                        <td>{dateTime(v.scheduled_at)}</td>
                        <td>
                          {ctx.data.brokers.find((b) => b.id === v.broker_id)
                            ?.name || "Minha conta"}
                        </td>
                        <td>
                          <Badge>{v.status}</Badge>
                        </td>
                        <td>
                          <select
                            aria-label="Situação da visita"
                            className="crm-compact-status"
                            value={v.status}
                            disabled={ctx.busy}
                            onChange={(e) =>
                              void ctx.run(() =>
                                supabase
                                  .from("visits")
                                  .update({ status: e.target.value })
                                  .eq("id", v.id)
                                  .select("id")
                                  .single(),
                              )
                            }
                          >
                            {[
                              "agendada",
                              "confirmada",
                              "realizada",
                              "cancelada",
                              "remarcada",
                            ].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {(tab === "tasks" ? !taskRows.length : !visitRows.length) && (
              <Empty
                title="Nenhum compromisso encontrado"
                description="Agende a próxima ação ou ajuste os filtros."
              />
            )}
          </div>
        )}
      </SectionState>
      {mode && (
        <Modal
          title={`${editing ? "Editar" : "Novo"} ${isTask ? "compromisso" : "agendamento de visita"}`}
          description="As datas seguem o horário local do seu navegador."
          onClose={() => {
            setMode("");
            setEditing(null);
          }}
        >
          <EntityForm
            fields={fields}
            onClose={() => {
              setMode("");
              setEditing(null);
            }}
            onSubmit={save}
          />
        </Modal>
      )}
    </>
  );
}
