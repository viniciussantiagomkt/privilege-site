"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type LeadStatus =
  | "novo"
  | "em atendimento"
  | "visita agendada"
  | "convertido"
  | "perdido";

interface Lead {
  id: number;
  created_at?: string;
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  source?: string | null;
  status?: LeadStatus | string;
  property_id?: number | null;
  property_title?: string | null;
  property_slug?: string | null;
  page_path?: string | null;
  origin_detail?: string | null;
  notes?: string | null;
}

const statuses: LeadStatus[] = [
  "novo",
  "em atendimento",
  "visita agendada",
  "convertido",
  "perdido",
];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  useEffect(() => {
    async function loadLeads() {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      setLeads((data || []) as Lead[]);
      setLoading(false);
    }

    void loadLeads();
  }, []);

  const sources = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.source).filter(Boolean))) as string[],
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return leads.filter((lead) => {
      const searchable = [
        lead.name,
        lead.phone,
        lead.email,
        lead.property_title,
        lead.property_slug,
        lead.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!status || lead.status === status) &&
        (!source || lead.source === source) &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [leads, query, source, status]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const visibleLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize);

  async function updateLead(id: number, payload: Partial<Lead>) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...payload } : lead))
    );

    const { error } = await supabase.from("leads").update(payload).eq("id", id);

    if (error) {
      alert(error.message);
    }
  }

  return (
    <main className="admin-editorial min-h-screen bg-[#E0E8E6] px-4 py-8 text-[#030F18] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/admin" className="text-sm text-[#446E87] transition hover:text-[#1D4052]">
          Voltar ao dashboard
        </a>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87]">
              Comercial
            </span>
            <h1 className="mt-3 text-[clamp(2.4rem,10vw,4.5rem)] font-bold">
              Leads recebidos
            </h1>
          </div>
          <p className="text-sm text-[#030F18]/56">
            {filteredLeads.length} registros encontrados
          </p>
        </div>

        <div className="mt-8 grid gap-3 rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-3 md:grid-cols-[1fr_180px_180px]">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, telefone, e-mail ou imóvel"
            className="h-14 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-5 outline-none"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-14 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-5 outline-none"
          >
            <option value="">Todos os status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
            className="h-14 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-5 outline-none"
          >
            <option value="">Todas as origens</option>
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <section className="mt-8 grid gap-4">
          {loading ? (
            <div className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-8">
              Carregando leads...
            </div>
          ) : visibleLeads.length > 0 ? (
            visibleLeads.map((lead) => (
              <article
                key={lead.id}
                className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-5 shadow-[0_20px_70px_rgba(3,15,24,0.05)] md:p-6"
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold">{lead.name}</h2>
                      <span className="rounded-full border border-[#446E87]/18 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#446E87]">
                        {lead.source || "site"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-[#030F18]/62 md:grid-cols-2">
                      <span>{lead.phone}</span>
                      <span>{lead.email || "E-mail não informado"}</span>
                      <span>{lead.property_title || "Sem imóvel vinculado"}</span>
                      <span>{lead.page_path || "Página não registrada"}</span>
                    </div>

                    {lead.message && (
                      <p className="mt-4 rounded-2xl bg-[#E0E8E6]/52 p-4 text-sm leading-6 text-[#030F18]/66">
                        {lead.message}
                      </p>
                    )}

                    <textarea
                      defaultValue={lead.notes || ""}
                      onBlur={(event) => updateLead(lead.id, { notes: event.target.value })}
                      placeholder="Observações internas"
                      className="mt-4 min-h-24 w-full rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/60 p-4 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <select
                      value={lead.status || "novo"}
                      onChange={(event) =>
                        updateLead(lead.id, { status: event.target.value as LeadStatus })
                      }
                      className="h-12 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-4 outline-none"
                    >
                      {statuses.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    {lead.property_slug && (
                      <a
                        href={`/imoveis/${lead.property_slug}`}
                        target="_blank"
                        className="flex h-12 items-center justify-center rounded-2xl border border-[#1D4052]/18 text-[#1D4052] transition hover:bg-white/30"
                      >
                        Abrir imóvel
                      </a>
                    )}

                    <span className="text-xs text-[#030F18]/45">
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleString("pt-BR")
                        : "Sem data"}
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-8 text-center text-[#030F18]/56">
              Nenhum lead encontrado com esses filtros.
            </div>
          )}
        </section>

        <div className="mt-8 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="h-12 rounded-full border border-[#1D4052]/18 px-5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-[#030F18]/52">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="h-12 rounded-full border border-[#1D4052]/18 px-5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </main>
  );
}
