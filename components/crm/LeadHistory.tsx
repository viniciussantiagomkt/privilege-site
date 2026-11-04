"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateTime, type Activity } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { Button, Empty } from "./UI";

export function LeadHistory({ leadId }: { leadId: number }) {
  const ctx = useWorkspace();
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    rows: Activity[];
    error: boolean;
    hasMore: boolean;
  } | null>(null);
  const key = `${ctx.userId}:${ctx.role}:${leadId}:${ctx.updatedAt?.getTime()}:${page}`;
  useEffect(() => {
    let active = true;
    if (
      !ctx.userId ||
      !ctx.data.leads.some((l) => l.id === leadId) ||
      ctx.errors.leads
    )
      return;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("lead_activities")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(page * 100, page * 100 + 100);
        if (active)
          setResult({
            key,
            rows: error ? [] : (data || []).slice(0, 100),
            error: !!error,
            hasMore: !error && (data || []).length > 100,
          });
      } catch {
        if (active) setResult({ key, rows: [], error: true, hasMore: false });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [key, leadId, page, ctx.userId, ctx.data.leads, ctx.errors.leads]);
  if (
    !ctx.userId ||
    ctx.errors.leads ||
    !ctx.data.leads.some((l) => l.id === leadId)
  )
    return null;
  if (result?.key !== key) return <p role="status">Carregando histórico…</p>;
  if (result.error)
    return (
      <p role="alert" className="crm-alert">
        Não foi possível carregar o histórico. Atualize os dados para tentar
        novamente.
      </p>
    );
  return result.rows.length ? (
    <>
      <p className="crm-work-scope">
        Histórico · página {page + 1}, até 100 atividades.
      </p>
      <div className="crm-timeline">
        {result.rows.map((a) => (
          <div key={a.id}>
            <small>{dateTime(a.created_at)}</small>
            <p>{a.description || a.type}</p>
          </div>
        ))}
      </div>
      <div className="crm-detail-actions">
        <Button
          secondary
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Mais recentes
        </Button>
        <Button
          secondary
          disabled={!result.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Mais antigas
        </Button>
      </div>
    </>
  ) : (
    <Empty
      title="O histórico começa com o contato"
      description="Anotações e alterações do atendimento aparecerão aqui."
      action={
        page > 0 ? (
          <Button secondary onClick={() => setPage(page - 1)}>
            Mais recentes
          </Button>
        ) : undefined
      }
    />
  );
}
