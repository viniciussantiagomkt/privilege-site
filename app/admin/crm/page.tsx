"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = { id: number; name: string; status: string; broker_id: string | null; first_contact_at: string | null };
type Item = { id: number; name?: string; title?: string; status?: string; read?: boolean };
type Property = { id: number; title: string; workflow_status: string; property_code: string | null; slug: string };
type Broker = { id: string; name: string };
type Activity = { id: number; description: string; created_at: string };

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900";

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Item[]>([]);
  const [clients, setClients] = useState<Item[]>([]);
  const [visits, setVisits] = useState<Item[]>([]);
  const [proposals, setProposals] = useState<Item[]>([]);
  const [negotiations, setNegotiations] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<Item[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userId, setUserId] = useState("");
  const [operations, setOperations] = useState(false);
  const [selectedLead, setSelectedLead] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedProposal, setSelectedProposal] = useState("");
  const [assignedBroker, setAssignedBroker] = useState("");
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [clientName, setClientName] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("em atendimento");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const queries = await Promise.all([
      supabase.from("leads").select("id,name,status,broker_id,first_contact_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("tasks").select("id,title,status").is("deleted_at", null).order("due_at").limit(100),
      supabase.from("clients").select("id,name").order("name").limit(200),
      supabase.from("visits").select("id,status").order("created_at", { ascending: false }).limit(100),
      supabase.from("proposals").select("id,status").order("created_at", { ascending: false }).limit(100),
      supabase.from("negotiations").select("id,status").order("created_at", { ascending: false }).limit(100),
      supabase.from("notifications").select("id,title,read").order("created_at", { ascending: false }).limit(50),
      supabase.from("properties").select("id,title,workflow_status,property_code,slug").is("deleted_at", null).limit(200),
      supabase.from("brokers").select("id,name").limit(100),
    ]);
    const error = queries.find((query) => query.error)?.error;
    if (error) throw new Error(error.message);
    setLeads(queries[0].data as Lead[]);
    setTasks(queries[1].data as Item[]);
    setClients(queries[2].data as Item[]);
    setVisits(queries[3].data as Item[]);
    setProposals(queries[4].data as Item[]);
    setNegotiations(queries[5].data as Item[]);
    setNotifications(queries[6].data as Item[]);
    setProperties(queries[7].data as Property[]);
    setBrokers(queries[8].data as Broker[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const [{ data: { user }, error }, { data: role, error: roleError }] = await Promise.all([
        supabase.auth.getUser(), supabase.rpc("current_user_role"),
      ]);
      if (!active) return;
      if (error || roleError || !user) { setMessage("Não foi possível validar sua sessão."); return; }
      setUserId(user.id);
      setOperations(["admin", "manager"].includes(role));
      try { await reload(); } catch (error) { if (active) setMessage(error instanceof Error ? error.message : "Falha ao carregar o CRM."); }
    }
    void initialize();
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      if (!selectedLead) { setActivities([]); return; }
      const { data, error } = await supabase.from("lead_activities").select("id,description,created_at")
        .eq("lead_id", Number(selectedLead)).order("created_at", { ascending: false });
      if (!active) return;
      if (error) setMessage(error.message);
      else setActivities(data as Activity[]);
    }
    void loadHistory();
    return () => { active = false; };
  }, [selectedLead, leads]);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await action();
      if (error) throw new Error(error.message);
      await reload();
      setMessage("Alteração salva.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }

  const lead = leads.find((item) => String(item.id) === selectedLead);
  const brokerId = lead?.broker_id || userId;
  const relations = { client_id: selectedClient ? Number(selectedClient) : null,
    property_id: selectedProperty ? Number(selectedProperty) : null, broker_id: brokerId };

  return <main className="min-h-screen bg-slate-100 p-5 text-slate-900 md:p-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin" className="text-blue-800">Voltar ao dashboard</Link>
      <h1 className="text-3xl font-bold">Comercial Privilege</h1>
      <p>Selecione um lead para registrar contato, distribuir o atendimento e acompanhar os próximos passos.</p>
      <p role="status" aria-live="polite" className="min-h-6 text-blue-900">{message}</p>
      <fieldset disabled={busy || !userId} className="space-y-6 disabled:opacity-60">
        <section className="grid gap-4 rounded-2xl bg-white p-5 md:grid-cols-2">
          <label>Lead<select className={inputClass} value={selectedLead} onChange={(event) => setSelectedLead(event.target.value)}>
            <option value="">Selecione</option>{leads.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}
          </select></label>
          <label>Etapa<select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            {["novo", "em atendimento", "visita agendada", "convertido", "perdido"].map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label>Motivo da atribuição ou perda<input className={inputClass} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>
          {operations && <label>Responsável<select className={inputClass} value={assignedBroker} onChange={(event) => setAssignedBroker(event.target.value)}>
            <option value="">Selecione</option>{brokers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>}
          <button className="rounded-xl bg-blue-900 p-3 text-white disabled:opacity-40" disabled={!selectedLead} onClick={() => void run(() => supabase.rpc("crm_record_contact", { target_lead: Number(selectedLead) }))}>Registrar primeiro contato</button>
          <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!selectedLead || (status === "perdido" && !reason.trim())} onClick={() => void run(() => supabase.from("leads").update({ status, ...(status === "perdido" ? { lost_reason: reason.trim() } : {}) }).eq("id", Number(selectedLead)).select("id").single())}>Salvar etapa</button>
          {operations && <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!selectedLead || !assignedBroker || !reason.trim()} onClick={() => void run(() => supabase.rpc("crm_assign_lead", { target_lead: Number(selectedLead), target_broker: assignedBroker, assignment_reason: reason.trim() }))}>Atribuir ou reatribuir</button>}
        </section>
        <section className="grid gap-4 rounded-2xl bg-white p-5 md:grid-cols-2">
          <label>Próximo contato<input className={inputClass} value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Data e hora<input className={inputClass} type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
          <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!selectedLead || !title.trim() || !dueAt} onClick={() => void run(() => supabase.from("tasks").insert({ title: title.trim(), lead_id: Number(selectedLead), broker_id: brokerId, due_at: new Date(dueAt).toISOString() }))}>Agendar retorno</button>
          <label>Nome do cliente<input className={inputClass} value={clientName} maxLength={160} onChange={(event) => setClientName(event.target.value)} /></label>
          <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!clientName.trim()} onClick={() => void run(() => supabase.from("clients").insert({ name: clientName.trim(), broker_id: brokerId }))}>Cadastrar cliente</button>
          <label>Cliente<select className={inputClass} value={selectedClient} onChange={(event) => setSelectedClient(event.target.value)}><option value="">Selecione</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Imóvel<select className={inputClass} value={selectedProperty} onChange={(event) => setSelectedProperty(event.target.value)}><option value="">Selecione</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.property_code || item.id} · {item.title}</option>)}</select></label>
          <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!selectedClient || !selectedProperty || !dueAt} onClick={() => void run(() => supabase.from("visits").insert({ ...relations, scheduled_at: new Date(dueAt).toISOString() }))}>Agendar visita</button>
          <label>Valor da proposta<input className={inputClass} type="number" min="0.01" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} /></label>
          <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!selectedClient || !selectedProperty || !(Number(value) > 0)} onClick={() => void run(() => supabase.from("proposals").insert({ ...relations, value: Number(value) }))}>Criar proposta</button>
          <label>Proposta<select className={inputClass} value={selectedProposal} onChange={(event) => setSelectedProposal(event.target.value)}><option value="">Selecione</option>{proposals.map((item) => <option key={item.id} value={item.id}>Proposta {item.id} · {item.status}</option>)}</select></label>
          <button className="rounded-xl border p-3 disabled:opacity-40" disabled={!selectedProposal} onClick={() => void run(() => supabase.from("negotiations").insert({ proposal_id: Number(selectedProposal) }))}>Abrir negociação</button>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Retornos</h2>{tasks.map((item) => <p key={item.id} className="my-3">{item.title} · {item.status} <button className="text-blue-800" disabled={item.status === "concluida"} onClick={() => void run(() => supabase.from("tasks").update({ status: "concluida" }).eq("id", item.id).select("id").single())}>Concluir</button></p>)}</div>
          <div className="rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Notificações</h2>{notifications.map((item) => <p key={item.id} className="my-3">{item.title} <button className="text-blue-800" disabled={item.read} onClick={() => void run(() => supabase.rpc("crm_read_notification", { target_notification: item.id }))}>{item.read ? "Lida" : "Marcar como lida"}</button></p>)}</div>
          <div className="rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Histórico do lead</h2>{activities.map((item) => <p key={item.id} className="my-3">{new Date(item.created_at).toLocaleString("pt-BR")} · {item.description}</p>)}</div>
          <div className="rounded-2xl bg-white p-5"><h2 className="text-xl font-bold">Fluxo comercial</h2><p className="mt-3">{visits.length} visitas · {proposals.length} propostas · {negotiations.length} negociações</p><p className="mt-3 text-sm">A lista mostra até 100 registros por etapa e 200 leads/clientes.</p></div>
          {operations && <div className="rounded-2xl bg-white p-5 md:col-span-2"><h2 className="text-xl font-bold">Aprovação de imóveis</h2>{properties.filter((item) => !["publicado", "aprovado"].includes(item.workflow_status)).map((item) => <p key={item.id} className="my-3">{item.property_code} · {item.title} <button className="text-blue-800" onClick={() => void run(() => supabase.from("properties").update({ workflow_status: "publicado", publish_on_site: true, approved_by: userId, approved_at: new Date().toISOString() }).eq("id", item.id).select("id").single())}>Aprovar e publicar</button></p>)}</div>}
        </section>
      </fieldset>
    </div>
  </main>;
}
