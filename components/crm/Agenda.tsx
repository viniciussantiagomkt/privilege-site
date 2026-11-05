"use client";
import { useState } from "react";
import { useEntityIntent } from "./useEntityIntent";
import { TaskCompleteButton } from "./TaskCompleteButton";
import { AgendaEditor } from "./AgendaEditor";
import { recordId } from "@/lib/crm/broker-workspace";
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
  Button,
} from "./UI";
import { matches, dateTime, type Task, type Visit } from "@/lib/crm/model";
export function Agenda() {
  const ctx = useWorkspace();
  const [tab, setTab] = useState("calendar");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [mode, setMode] = useState("");
  const [editing, setEditing] = useState<Task | Visit | null>(null);
  const [filter, setFilter] = useState("pending");
  const [leadSeed, setLeadSeed] = useState<number | null>(null);
  useEntityIntent({
    "new:task": () => {
      const raw = new URLSearchParams(ctx.routeSearch).get("lead");
      const id = recordId(raw);
      if (raw && (!id || !ctx.data.leads.some((l) => l.id === id)))
        return false;
      setLeadSeed(id);
      setEditing(null);
      setMode("task");
      return true;
    },
    "new:visit": () => {
      setEditing(null);
      setMode("visit");
      return true;
    },
    task: (id) => {
      const row = ctx.data.tasks.find((t) => t.id === id);
      if (!row) return false;
      setEditing(row);
      setMode("task");
      return true;
    },
    visit: (id) => {
      const row = ctx.data.visits.find((v) => v.id === id);
      if (!row) return false;
      setEditing(row);
      setMode("visit");
      return true;
    },
  });
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
                            <TaskCompleteButton task={t} />
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
          <AgendaEditor
            mode={mode}
            editing={editing}
            leadSeed={leadSeed}
            onClose={() => {
              setMode("");
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
