"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { Panel, Button, EntityForm, text } from "./UI";
interface Review {
  sale_id: number;
  broker_id: string;
  value: number;
  sale_date: string;
  revision: number;
  status: string;
}
export function SaleReview() {
  const ctx = useWorkspace();
  const [rows, setRows] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.rpc("crm_sale_review_queue").then(({ data, error }) => {
      if (active) {
        setRows(error ? [] : data || []);
        setError(error?.message || "");
      }
    });
    return () => {
      active = false;
    };
  }, [ctx.userId, ctx.updatedAt]);
  return (
    <Panel
      title="Revisão financeira e documental"
      description="Até 200 registros recentes. Esta fila não expõe clientes, imóveis ou informações da carteira privada."
    >
      {error && <p role="alert">{error}</p>}
      {rows.map((r) => (
        <div className="crm-detail-pill" key={r.sale_id}>
          <span>
            Registro #{r.sale_id} ·{" "}
            {ctx.data.brokers.find((b) => b.id === r.broker_id)?.name ||
              "Corretor"}{" "}
            · {money(r.value)} · {r.sale_date} ·{" "}
            {r.status === "confirmed"
              ? "Confirmado"
              : r.status === "rejected"
                ? "Rejeitado"
                : "Pendente"}
          </span>{" "}
          <Button secondary disabled={ctx.busy} onClick={() => setSelected(r)}>
            Revisar
          </Button>
        </div>
      ))}
      {selected && (
        <EntityForm
          fields={[
            {
              name: "decision",
              label: "Decisão",
              required: true,
              options: [
                { value: "confirmed", label: "Confirmar" },
                { value: "rejected", label: "Rejeitar" },
              ],
            },
            {
              name: "reason",
              label: "Motivo da revisão",
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setSelected(null)}
          onSubmit={async (f) => {
            const ok = await ctx.run(
              () =>
                supabase.rpc("crm_review_sale", {
                  target_sale: selected.sale_id,
                  expected_revision: selected.revision,
                  decision: text(f, "decision"),
                  review_reason: text(f, "reason"),
                }),
              "Revisão registrada.",
            );
            if (ok) setSelected(null);
            return ok;
          }}
        />
      )}
    </Panel>
  );
}
