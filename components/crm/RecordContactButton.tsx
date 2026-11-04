"use client";
import { CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "./Workspace";
import { Button } from "./UI";

export function RecordContactButton({ leadId }: { leadId: number }) {
  const ctx = useWorkspace();
  const lead = ctx.data.leads.find((l) => l.id === leadId);
  return (
    <Button
      secondary
      disabled={ctx.busy || !!ctx.errors.leads || !lead}
      onClick={() =>
        void ctx.run(
          () => supabase.rpc("crm_record_contact", { target_lead: leadId }),
          "Contato registrado.",
        )
      }
    >
      <CheckCheck size={15} />
      {lead?.first_contact_at ? "Registrar contato" : "Primeiro contato"}
    </Button>
  );
}
