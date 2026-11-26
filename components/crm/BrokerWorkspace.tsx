"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  Plus,
  ChevronDown,
  CalendarDays,
  Building2,
  Users,
  Handshake,
} from "lucide-react";
import {
  WORK_TABS,
  WORK_TABLES,
  workTab,
  workRecords,
  workDestination,
  canAddWork,
  type WorkKind,
  type WorkTab,
} from "@/lib/crm/broker-workspace";
import { dateTime } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { Badge, Button, Empty, Modal, PageHeading } from "./UI";
import { TaskCompleteButton } from "./TaskCompleteButton";
import { RecordContactButton } from "./RecordContactButton";
import { LeadHistory } from "./LeadHistory";
import { ContactWhatsAppLink } from "./ContactWhatsAppLink";
import { ClientServiceDrawer } from "./ClientService";
import { DailyPlan } from "./DailyPlan";
import { AgendaEditor } from "./AgendaEditor";
import type { Task, Visit } from "@/lib/crm/model";

const ADD_ACTIONS: { kind: WorkKind; label: string }[] = [
  { kind: "contact", label: "Cliente / proprietário" },
  { kind: "lead", label: "Lead" },
  { kind: "property", label: "Imóvel" },
  { kind: "task", label: "Tarefa" },
  { kind: "visit", label: "Visita" },
  { kind: "proposal", label: "Proposta" },
];
const TAB_ICONS = [CalendarDays, Users, Building2, Handshake];

export function BrokerWorkspace() {
  const ctx = useWorkspace();
  // Remount private selection state even if the surrounding guard is still validating.
  return <MyWork key={`${ctx.userId}:${ctx.role}`} />;
}
function MyWork() {
  const ctx = useWorkspace();
  const router = useRouter();
  const tab = workTab(new URLSearchParams(ctx.routeSearch).get("aba"));
  const [selections, setSelections] = useState<
    Partial<Record<WorkTab, { kind: WorkKind; id: number }>>
  >({});
  const [add, setAdd] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const [agenda, setAgenda] = useState<{ mode: "task" | "visit"; id?: number } | null>(null);
  const [agendaDirty, setAgendaDirty] = useState(false);
  const errors = ["session", ...WORK_TABLES[tab]].filter((t) => ctx.errors[t]);
  const unavailable = ctx.loading || errors.length > 0;
  const records = unavailable ? [] : workRecords(tab, ctx.data, ctx.query);
  const selection = selections[tab];
  // Resolve from fresh scoped rows, never retain a private row snapshot in state.
  const selected =
    !unavailable && selection
      ? workRecords(tab, ctx.data, "").find(
          (r) => r.id === selection.id && r.kind === selection.kind,
        )
      : undefined;
  const goTab = (next: WorkTab) =>
    router.replace(`/admin/meu-trabalho?aba=${next}`, { scroll: false });
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % WORK_TABS.length;
    else if (event.key === "ArrowLeft")
      next = (index + WORK_TABS.length - 1) % WORK_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = WORK_TABS.length - 1;
    else return;
    event.preventDefault();
    goTab(WORK_TABS[next].id);
    document.getElementById(`work-tab-${WORK_TABS[next].id}`)?.focus();
  }
  const close = () =>
    setSelections((current) => ({ ...current, [tab]: undefined }));
  return (
    <div className="crm-my-work">
      <PageHeading
        eyebrow="Seu dia, em contexto"
        title="Meu Trabalho"
        description="Atendimentos, carteira e próximos passos."
        action={
          canAddWork(ctx.role, ctx.userId) && !ctx.errors.session ? (
            <div className="crm-work-add">
              <button
                className="crm-button"
                aria-expanded={add}
                aria-controls="work-add-options"
                onClick={() => setAdd(!add)}
              >
                <Plus size={17} />
                Adicionar
                <ChevronDown size={14} />
              </button>
              {add && (
                <div
                  id="work-add-options"
                  className="crm-work-add-options"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setAdd(false);
                      e.currentTarget.parentElement
                        ?.querySelector("button")
                        ?.focus();
                    }
                  }}
                >
                  {ADD_ACTIONS.map((a) =>
                    a.kind === "contact" ? (
                      <button
                        key={a.kind}
                        type="button"
                        onClick={() => {
                          setAdd(false);
                          setNewClient(true);
                          goTab("atendimentos");
                        }}
                      >
                        Cliente / proprietário
                        <Plus size={14} />
                      </button>
                    ) : a.kind === "task" || a.kind === "visit" ? (
                      <button key={a.kind} type="button" onClick={() => { setAdd(false); setAgenda({ mode: a.kind as "task" | "visit" }); goTab("hoje"); }}>{a.label}<Plus size={14} /></button>
                    ) : (
                      <Link
                        key={a.kind}
                        href={workDestination(a.kind)}
                        onClick={() => setAdd(false)}
                      >
                        {a.label}
                        <ArrowUpRight size={14} />
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          ) : undefined
        }
      />
      <div
        className="crm-work-tabs"
        role="tablist"
        aria-label="Áreas do Meu Trabalho"
      >
        {WORK_TABS.map((t, index) => {
          const Icon = TAB_ICONS[index];
          return (
            <button
              key={t.id}
              id={`work-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`work-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => goTab(t.id)}
              onKeyDown={(e) => tabKey(e, index)}
            >
              <Icon size={17} />
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "hoje" && <section role="tabpanel" id="work-panel-hoje" aria-labelledby="work-tab-hoje"><DailyPlan onOpen={r => { if (r.kind === "task" || r.kind === "visit") setAgenda({ mode: r.kind, id: r.id }); }} onCreate={mode => setAgenda({ mode })} /></section>}
      {tab !== "hoje" && <section
        role="tabpanel"
        id={`work-panel-${tab}`}
        aria-labelledby={`work-tab-${tab}`}
        tabIndex={0}
        className="crm-work-panel"
        aria-busy={ctx.loading}
      >
        <div className="crm-work-caption">
          <p>
            {WORK_TABS.find((t) => t.id === tab)?.label}
          </p>
          {!unavailable && <span>{records.length} registros encontrados</span>}
          {tab === "atendimentos" &&
            !unavailable &&
            canAddWork(ctx.role, ctx.userId) && (
              <Button secondary onClick={() => setNewClient(true)}>
                Novo cliente
              </Button>
            )}
        </div>
        <p id="work-search-scope" className="crm-work-scope">
          Busca nos dados autorizados desta aba, até 500 registros por tabela.
          Não é uma pesquisa global da carteira.
        </p>
        {ctx.loading ? (
          <div
            className="crm-skeleton-grid"
            role="status"
            aria-label="Carregando esta aba"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="crm-skeleton" />
            ))}
          </div>
        ) : errors.length ? (
          <div className="crm-alert" role="alert">
            <strong>Dados desta aba indisponíveis</strong>
            <p>{errors.map((t) => ctx.errors[t]).join(" · ")}</p>
            <Button secondary onClick={() => void ctx.reload()}>
              Tentar novamente
            </Button>
          </div>
        ) : records.length ? (
          <div className="crm-work-records">
            {records.map((r) => (
              <button
                type="button"
                key={`${r.kind}:${r.id}`}
                className="crm-work-record"
                aria-haspopup="dialog"
                onClick={() =>
                  setSelections((current) => ({
                    ...current,
                    [tab]: { kind: r.kind, id: r.id },
                  }))
                }
              >
                <span>
                  <strong>{r.title}</strong>
                  <small>{r.detail}</small>
                  {r.when && <small>{dateTime(r.when)}</small>}
                </span>
                <span>
                  <Badge>{r.status.replaceAll("_", " ")}</Badge>
                  <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title={
              ctx.query
                ? "Nenhum resultado nesta aba"
                : "Nenhum registro disponível"
            }
            description={
              ctx.query
                ? "Ajuste a busca ou consulte a tela especializada."
                : "Os registros autorizados aparecerão aqui."
            }
          />
        )}
      </section>}
      {tab === "atendimentos" &&
        !unavailable &&
        (newClient || selected?.kind === "contact") && (
          <ClientServiceDrawer
            key={newClient ? "new" : selected!.id}
            clientId={newClient ? undefined : selected!.id}
            onClose={() => {
              setNewClient(false);
              close();
            }}
            onSelect={(id) => {
              setNewClient(false);
              setSelections((current) => ({
                ...current,
                atendimentos: { kind: "contact", id },
              }));
            }}
          />
        )}
      {selected && selected.kind !== "contact" && !newClient && (
        <Modal
          side
          title={selected.title}
          description={selected.detail}
          onClose={close}
        >
          <Badge>{selected.status.replaceAll("_", " ")}</Badge>
          {selected.when && (
            <p className="crm-work-detail">{dateTime(selected.when)}</p>
          )}
          {selected.description && (
            <p className="crm-work-detail">{selected.description}</p>
          )}
          <div className="crm-work-context-actions">
            <Link
              className="crm-button"
              href={workDestination(selected.kind, selected.id)}
            >
              <ArrowUpRight size={16} />
              {selected.kind === "lead"
                ? "Histórico e atendimento"
                : selected.kind === "property"
                  ? "Ficha, edição e apresentações"
                  : "Abrir e editar"}
            </Link>
            {selected.kind === "task" &&
              ctx.data.tasks.find((t) => t.id === selected.id) && (
                <TaskCompleteButton
                  task={ctx.data.tasks.find((t) => t.id === selected.id)!}
                />
              )}
            {selected.kind === "lead" && (
              <>
                <RecordContactButton leadId={selected.id} />
                <Link
                  className="crm-button secondary"
                  href={`/admin/agenda?novo=task&lead=${selected.id}`}
                >
                  Agendar retorno
                </Link>
              </>
            )}
            {selected.kind === "lead" && (
              <ContactWhatsAppLink
                phone={ctx.data.leads.find((l) => l.id === selected.id)?.phone}
              />
            )}
            {selected.kind === "property" && (
              <Link
                className="crm-button secondary"
                href="/admin/apresentacoes"
              >
                Apresentações existentes
              </Link>
            )}
          </div>
          {selected.kind === "lead" && (
            <>
              <h3 className="crm-work-detail">Histórico e atividades</h3>
              <LeadHistory key={selected.id} leadId={selected.id} />
            </>
          )}
        </Modal>
      )}
      {agenda && tab === "hoje" && !unavailable && (!agenda.id || (agenda.mode === "task" ? ctx.data.tasks : ctx.data.visits).some(r => r.id === agenda.id && r.broker_id === ctx.userId)) && <Modal side title={agenda.id ? "Editar compromisso" : agenda.mode === "task" ? "Nova tarefa / retorno" : "Agendar visita"} onClose={() => { if (!agendaDirty || window.confirm("Descartar alterações não salvas?")) { setAgenda(null); setAgendaDirty(false); } }}>
        <AgendaEditor mode={agenda.mode} editing={agenda.id ? (agenda.mode === "task" ? ctx.data.tasks : ctx.data.visits).find(r => r.id === agenda.id) as Task | Visit : undefined} onDirty={() => setAgendaDirty(true)} onClose={() => { setAgenda(null); setAgendaDirty(false); }} onCancel={() => { if (!agendaDirty || window.confirm("Descartar alterações não salvas?")) { setAgenda(null); setAgendaDirty(false); } }} />
      </Modal>}
    </div>
  );
}
