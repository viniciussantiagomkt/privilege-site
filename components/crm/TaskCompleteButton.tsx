"use client";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Task } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { Button } from "./UI";

export function TaskCompleteButton({ task }: { task: Task }) {
  const ctx = useWorkspace();
  return (
    <Button
      secondary
      disabled={ctx.busy || task.status === "concluida"}
      onClick={() =>
        void ctx.run(() =>
          supabase
            .from("tasks")
            .update({ status: "concluida" })
            .eq("id", task.id)
            .select("id")
            .single(),
        )
      }
    >
      <Check size={14} />
      Concluir
    </Button>
  );
}
