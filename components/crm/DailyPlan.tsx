"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarPlus, ListTodo } from "lucide-react";
import { dailyQueue, inAgendaPeriod, type AgendaPeriod } from "@/lib/crm/operations";
import { workDestination, type WorkRecord } from "@/lib/crm/broker-workspace";
import { dateTime, matches } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { TaskCompleteButton } from "./TaskCompleteButton";
import { Button } from "./UI";

export function DailyPlan({ onOpen, onCreate, limit = 6 }: { onOpen?: (r: WorkRecord) => void; onCreate?: (mode: "task" | "visit") => void; limit?: number }) {
  const ctx = useWorkspace();
  const [period, setPeriod] = useState<AgendaPeriod>("all");
  if (ctx.loading) return <div className="crm-skeleton" aria-label="Carregando prioridades" role="status" />;
  if (["session", "tasks", "visits"].some(t => ctx.errors[t])) return <div className="crm-alert" role="alert">Agenda indisponível. <Button secondary onClick={() => void ctx.reload()}>Recarregar</Button></div>;
  const now = new Date();
  const queue = dailyQueue(ctx.data, ctx.userId, now).filter(r => matches(ctx.query, r.title, r.detail, r.reason));
  const rows = queue.filter(r => inAgendaPeriod(r.when!, period, now));
  return <section className="crm-ops" aria-label="Prioridades pessoais">
    <header className="crm-ops-heading"><div><p className="crm-eyebrow">Minha agenda</p><h2>Próximas ações</h2></div><div className="crm-ops-actions">
      {onCreate ? <><Button secondary onClick={() => onCreate("task")}><ListTodo size={16} />Nova tarefa</Button><Button secondary onClick={() => onCreate("visit")}><CalendarPlus size={16} />Agendar visita</Button></> : <Link className="crm-button secondary" href={workDestination("task")}><ListTodo size={16} />Nova tarefa</Link>}
    </div></header>
    <div className="crm-ops-periods" role="group" aria-label="Período das prioridades">
      {([["all", "Pendentes"], ["overdue", "Vencidos"], ["today", "Hoje"], ["week", "Próximos 7 dias"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}<span>{queue.filter(r => inAgendaPeriod(r.when!, value, now)).length}</span></button>)}
    </div>
    {!ctx.errors.leads && <p><Link href="/admin/leads">{ctx.data.leads.filter(l => l.broker_id === ctx.userId && !l.first_contact_at && !["convertido", "perdido"].includes(l.status.replaceAll("_", " "))).length} leads sem primeiro contato registrado</Link></p>}
    {rows.length ? <div className="crm-ops-list">{rows.slice(0, limit).map(r => <div className="crm-ops-row" key={`${r.kind}:${r.id}`}>
      <div><span className={`crm-ops-reason ${r.priority < 2 ? "late" : ""}`}>{r.reason}</span><h3>{r.title}</h3><p>{r.detail} · {dateTime(r.when)}</p></div>
      <div className="crm-ops-actions">{r.kind === "task" && <TaskCompleteButton task={ctx.data.tasks.find(t => t.id === r.id)!} />}{onOpen ? <Button secondary onClick={() => onOpen(r)}>Abrir<ArrowUpRight size={15} /></Button> : <Link className="crm-button secondary" href={workDestination(r.kind, r.id)}>Abrir<ArrowUpRight size={15} /></Link>}</div>
    </div>)}</div> : <p className="crm-ops-empty">Nenhum compromisso pendente neste período.</p>}
    <footer className="crm-ops-footer"><span>{Math.min(rows.length, limit)} de {rows.length} compromissos carregados</span><Link href="/admin/agenda">Agenda completa<ArrowUpRight size={14} /></Link></footer>
  </section>;
}
