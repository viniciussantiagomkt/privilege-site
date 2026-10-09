"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Target,
  Building2,
  CalendarDays,
  Wallet,
  Check,
  Globe,
  Users,
  Plus,
} from "lucide-react";
import { useWorkspace } from "./Workspace";
import { PageHeading, Metric, Panel, Empty, Badge, SectionState } from "./UI";
import {
  STAGES,
  normalizeStage,
  periodBuckets,
  money,
  dateTime,
  initials,
} from "@/lib/crm/model";
import { supabase } from "@/lib/supabase";
export function Dashboard() {
  const { data, userId, operations, loading, busy, run } = useWorkspace();
  const [scope, setScope] = useState("team");
  const mine = !operations || scope === "mine";
  const leads = data.leads.filter((l) => !mine || l.broker_id === userId);
  const properties = data.properties.filter(
    (p) => !mine || p.broker_id === userId || p.owner_id === userId,
  );
  const sales = data.sales.filter((s) => !mine || s.broker_id === userId);
  const tasks = data.tasks
    .filter(
      (t) => (!mine || t.broker_id === userId) && t.status !== "concluida",
    )
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const visits = data.visits
    .filter(
      (v) =>
        (!mine || v.broker_id === userId) &&
        ["agendada", "confirmada", "remarcada"].includes(v.status),
    )
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const buckets = periodBuckets(leads);
  const max = Math.max(...buckets.map((b) => b.total), 1);
  const sources = Object.entries(
    leads.reduce<Record<string, number>>((o, l) => {
      o[l.source] = (o[l.source] || 0) + 1;
      return o;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const now = new Date();
  const monthSales = sales.filter(
    (s) =>
      new Date(s.date + "T12:00:00").getMonth() === now.getMonth() &&
      new Date(s.date + "T12:00:00").getFullYear() === now.getFullYear(),
  );
  const name =
    data.brokers.find((b) => b.id === userId)?.name?.split(" ")[0] ||
    "bem-vindo";
  return (
    <>
      <PageHeading
        eyebrow="Visão geral"
        title={`Olá, ${name}.`}
        description="Sua operação imobiliária, em um só lugar."
        action={
          <>
            {operations && (
              <select
                aria-label="Escopo do dashboard"
                className="crm-scope-select"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="team">Visão da equipe</option>
                <option value="mine">Meu desempenho</option>
              </select>
            )}
            <Link href="/admin/leads" className="crm-button">
              <Plus size={16} />
              Gerenciar leads
            </Link>
          </>
        }
      />
      <SectionState
        tables={["leads", "properties", "sales", "tasks", "visits"]}
      >
        <div className="crm-metrics">
          <Metric
            label="Leads em atendimento"
            value={
              leads.filter((l) => !["convertido", "perdido"].includes(l.status))
                .length
            }
            detail={`${leads.filter((l) => l.status === "novo").length} aguardando primeiro contato`}
            icon={<Target size={18} />}
          />
          <Metric
            label="Portfólio de imóveis"
            value={properties.length}
            detail={`${properties.filter((p) => p.publish_on_site && ["aprovado", "publicado"].includes(p.workflow_status)).length} publicados no site`}
            icon={<Building2 size={18} />}
          />
          <Metric
            label="Próximas visitas"
            value={visits.filter((v) => new Date(v.scheduled_at) >= now).length}
            detail={`${tasks.filter((t) => new Date(t.due_at) < now).length} tarefas com prazo vencido`}
            icon={<CalendarDays size={18} />}
          />
          <Metric
            label="Vendas neste mês"
            value={money(
              monthSales.reduce((a, s) => a + Number(s.value || 0), 0),
            )}
            detail={`${monthSales.length} fechamento${monthSales.length === 1 ? "" : "s"} registrado${monthSales.length === 1 ? "" : "s"}`}
            icon={<Wallet size={18} />}
          />
        </div>
        <div className="crm-dashboard-grid">
          <Panel
            title="Novas oportunidades"
            description="Leads recebidos nos últimos seis meses"
            action={
              <Link href="/admin/leads">
                Ver pipeline <ArrowUpRight size={14} />
              </Link>
            }
          >
            <div
              className="crm-chart"
              role="img"
              aria-label={buckets
                .map((b) => `${b.label}: ${b.total} leads`)
                .join(", ")}
            >
              {buckets.map((b) => (
                <div className="crm-chart-column" key={b.label}>
                  <b>{b.total}</b>
                  <div
                    className="bar"
                    style={{ height: `${(b.total / max) * 130}px` }}
                  />
                  <small>{b.label}</small>
                </div>
              ))}
            </div>
            <p className="crm-chart-note">
              {leads.length
                ? `${leads.length} leads no total acessível ao seu perfil.`
                : "Nenhum lead recebido neste período."}
            </p>
          </Panel>
          <Panel
            title="Origem dos leads"
            description="De onde vêm suas oportunidades"
          >
            {sources.length ? (
              sources.slice(0, 5).map(([source, total]) => (
                <div className="crm-origin" key={source}>
                  <span>
                    <Globe size={16} />
                  </span>
                  <div>
                    <p>
                      <span>{source}</span>
                      <strong>{total}</strong>
                    </p>
                    <div className="crm-progress">
                      <i
                        style={{ width: `${(total / leads.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="Seu primeiro lead começa aqui"
                description="As origens serão calculadas automaticamente ao receber leads."
              />
            )}
          </Panel>
        </div>
        <div className="crm-dashboard-grid">
          <Panel
            title="Pipeline comercial"
            description="Distribuição atual das oportunidades"
          >
            <div className="crm-report-bars">
              {STAGES.map((s) => {
                const total = leads.filter(
                  (l) => normalizeStage(l.status) === s.id,
                ).length;
                return (
                  <div key={s.id}>
                    <span>{s.label}</span>
                    <div className="crm-progress">
                      <i
                        style={{
                          width: `${(total / Math.max(leads.length, 1)) * 100}%`,
                          background: s.color,
                        }}
                      />
                    </div>
                    <strong>{total}</strong>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel
            title="Sua próxima ação"
            description="Tarefas pendentes por vencimento"
            action={
              <Link href="/admin/agenda">
                Ver agenda <ArrowUpRight size={14} />
              </Link>
            }
          >
            {tasks.length ? (
              tasks.slice(0, 4).map((t) => (
                <div className="crm-list-row" key={t.id}>
                  <span className="crm-mini-avatar">
                    <CalendarDays size={13} />
                  </span>
                  <div>
                    <strong>{t.title}</strong>
                    <small>{dateTime(t.due_at)}</small>
                  </div>
                  <Badge tone={new Date(t.due_at) < now ? "red" : "blue"}>
                    {new Date(t.due_at) < now ? "Atrasada" : "Pendente"}
                  </Badge>
                  <button
                    className="crm-icon-button"
                    aria-label={`Concluir ${t.title}`}
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        supabase
                          .from("tasks")
                          .update({ status: "concluida" })
                          .eq("id", t.id)
                          .select("id")
                          .single(),
                      )
                    }
                  >
                    <Check size={15} />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Sua agenda está em dia"
                description="Agende tarefas e retornos para não perder oportunidades."
              />
            )}
          </Panel>
        </div>
        <div className="crm-dashboard-grid">
          <Panel
            title="Leads recentes"
            description="Comece um novo atendimento"
            action={
              <Link href="/admin/leads">
                Ver todos <ArrowUpRight size={14} />
              </Link>
            }
          >
            {leads.length ? (
              leads
                .slice()
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, 4)
                .map((l) => (
                  <div className="crm-list-row" key={l.id}>
                    <span className="crm-user-avatar">{initials(l.name)}</span>
                    <div>
                      <Link
                        href={`/admin/leads?lead=${l.id}`}
                        className="crm-link-button"
                      >
                        <strong>{l.name}</strong>
                      </Link>
                      <small>
                        {l.source} · {l.property_title || "Interesse em imóvel"}
                      </small>
                    </div>
                    <Badge>{normalizeStage(l.status)}</Badge>
                  </div>
                ))
            ) : (
              <Empty
                title="Nenhum atendimento por aqui"
                description="Cadastre um lead ou acompanhe os recebidos pelo site."
                action={
                  <Link href="/admin/leads" className="crm-button secondary">
                    Abrir leads
                  </Link>
                }
              />
            )}
          </Panel>
          <Panel
            title="Visitas agendadas"
            description="Prepare-se para os próximos encontros"
          >
            {visits.length ? (
              visits.slice(0, 4).map((v) => (
                <div className="crm-list-row" key={v.id}>
                  <span className="crm-mini-avatar">
                    <Users size={13} />
                  </span>
                  <div>
                    <strong>
                      {data.clients.find((c) => c.id === v.client_id)?.name ||
                        "Cliente"}
                    </strong>
                    <small>
                      {data.properties.find((p) => p.id === v.property_id)
                        ?.title || "Imóvel"}
                      <br />
                      {dateTime(v.scheduled_at)}
                    </small>
                  </div>
                  <Badge>{v.status}</Badge>
                </div>
              ))
            ) : (
              <Empty
                title="Novas visitas, novos negócios"
                description="As visitas cadastradas na agenda aparecerão aqui."
              />
            )}
          </Panel>
        </div>
        {!loading &&
          properties.some((p) => p.workflow_status === "pendente") &&
          operations && (
            <Panel
              title="Imóveis aguardando aprovação"
              description="Revise o cadastro antes de publicar"
              action={
                <Link href="/admin/imoveis">
                  Revisar imóveis <ArrowUpRight size={14} />
                </Link>
              }
            >
              {properties
                .filter((p) => p.workflow_status === "pendente")
                .slice(0, 3)
                .map((p) => (
                  <div className="crm-list-row" key={p.id}>
                    <div>
                      <strong>{p.title}</strong>
                      <small>
                        {p.property_code} · {p.location}
                      </small>
                    </div>
                    <Badge tone="amber">Pendente</Badge>
                  </div>
                ))}
            </Panel>
          )}
      </SectionState>
    </>
  );
}
