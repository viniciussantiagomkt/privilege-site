"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "./Workspace";
import { EntityForm, Button, text, Panel, type Field } from "./UI";
export function LeadTransfer({
  leadId,
  onDone,
}: {
  leadId: number;
  onDone: () => void;
}) {
  const ctx = useWorkspace();
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.rpc("crm_transfer_candidates").then(({ data, error }) => {
      if (active) {
        setCandidates(data || []);
        setError(error?.message || "");
      }
    });
    return () => {
      active = false;
    };
  }, [ctx.userId]);
  const fields: Field[] = [
    {
      name: "broker",
      label: "Destinatário",
      required: true,
      options: candidates.map((b) => ({ value: b.id, label: b.name })),
    },
    {
      name: "reason",
      label: "Motivo e consentimento para transferir este lead",
      type: "textarea",
      required: true,
    },
  ];
  return (
    <Panel
      title="Transferência consentida"
      description="O destinatário precisa aceitar. Clientes vinculados e suas notas privadas continuam com o proprietário original."
    >
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <EntityForm
          fields={fields}
          onClose={onDone}
          onSubmit={async (f) => {
            const ok = await ctx.run(
              () =>
                supabase.rpc("crm_request_lead_transfer", {
                  target_lead: leadId,
                  target_broker: text(f, "broker"),
                  transfer_reason: text(f, "reason"),
                }),
              "Solicitação enviada para aceite do destinatário.",
            );
            if (ok) onDone();
            return ok;
          }}
        />
      )}
    </Panel>
  );
}
export function TransferInbox() {
  const ctx = useWorkspace();
  const [requests, setRequests] = useState<
    { id: number; lead_id: number; reason: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    void supabase
      .from("lead_transfer_requests")
      .select("id,lead_id,reason")
      .eq("to_user", ctx.userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("id")
      .limit(100)
      .then(({ data, error }) => {
        if (active) setRequests(error ? [] : data || []);
      });
    return () => {
      active = false;
    };
  }, [ctx.userId, ctx.updatedAt]);
  if (!requests.length) return null;
  return (
    <Panel
      title="Transferências aguardando seu aceite"
      description="Aceitar transfere a responsabilidade do lead e preserva a carteira de clientes do remetente."
    >
      {requests.map((r) => (
        <div key={r.id} className="crm-detail-pill">
          <span>
            Lead #{r.lead_id}: {r.reason}
          </span>{" "}
          <Button
            disabled={ctx.busy}
            onClick={() =>
              void ctx.run(
                () =>
                  supabase.rpc("crm_accept_lead_transfer", {
                    target_request: r.id,
                  }),
                "Transferência aceita.",
              )
            }
          >
            Aceitar transferência
          </Button>
        </div>
      ))}
    </Panel>
  );
}
