"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { PageHeading, Metric, Panel } from "./UI";
import { Target, Wallet, Users } from "lucide-react";
interface Metrics {
  leads: number;
  active_leads: number;
  queue: number;
  converted: number;
  sales: number;
  volume: number;
  brokers: {
    broker_id: string;
    leads: number;
    converted: number;
    sales: number;
    volume: number;
  }[];
}
export function ManagementOverview({
  onPersonal,
}: {
  onPersonal?: () => void;
}) {
  const ctx = useWorkspace();
  const [period, setPeriod] = useState(180);
  const [result, setResult] = useState<{
    data: Metrics | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: true });
  useEffect(() => {
    let active = true;
    void supabase
      .rpc("crm_management_metrics", { period_days: period })
      .then(({ data, error }) => {
        if (active)
          setResult({
            data: error ? null : data,
            error: error?.message || "",
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [period, ctx.userId, ctx.role, ctx.updatedAt]);
  return (
    <>
      <PageHeading
        eyebrow="Supervisão operacional"
        title="Indicadores da equipe"
        description="Totais agregados. As carteiras individuais permanecem privadas."
        action={
          <>
            {onPersonal && (
              <button className="crm-button secondary" onClick={onPersonal}>
                Minha carteira
              </button>
            )}
            <select
              aria-label="Período dos indicadores"
              className="crm-scope-select"
              value={period}
              onChange={(e) => {
                setResult({ data: null, error: "", loading: true });
                setPeriod(Number(e.target.value));
              }}
            >
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={180}>Últimos 180 dias</option>
              <option value={365}>Últimos 365 dias</option>
            </select>
          </>
        }
      />
      {result.loading ? (
        <p role="status">Carregando indicadores...</p>
      ) : result.error ? (
        <p role="alert" className="crm-alert">
          {result.error}
        </p>
      ) : (
        result.data && (
          <>
            <div className="crm-metrics">
              <Metric
                label="Leads no período"
                value={result.data.leads}
                detail={result.data.active_leads + " em atendimento"}
                icon={<Target size={18} />}
              />
              <Metric
                label="Fila institucional"
                value={result.data.queue}
                detail="Ainda sem responsável"
                icon={<Users size={18} />}
              />
              <Metric
                label="Vendas registradas"
                value={result.data.sales}
                detail="Registro comercial, sujeito à revisão financeira"
                icon={<Wallet size={18} />}
              />
              <Metric
                label="Volume registrado"
                value={money(result.data.volume)}
                detail="Não equivale a recebimento confirmado"
                icon={<Wallet size={18} />}
              />
            </div>
            <Panel
              title="Desempenho profissional"
              description="Sem nomes de clientes, contatos, notas ou links privados."
            >
              <div className="crm-table-wrap">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Corretor</th>
                      <th>Leads</th>
                      <th>Convertidos</th>
                      <th>Vendas</th>
                      <th>Volume registrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.brokers.map((b) => (
                      <tr key={b.broker_id}>
                        <td>
                          {ctx.data.brokers.find((r) => r.id === b.broker_id)
                            ?.name || "Corretor ativo"}
                        </td>
                        <td>{b.leads}</td>
                        <td>{b.converted}</td>
                        <td>{b.sales}</td>
                        <td>{money(b.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )
      )}
    </>
  );
}
