"use client";
import { useRef } from "react";
import type { Task, Visit, CrmProperty } from "@/lib/crm/model";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "./Workspace";
import { EntityForm, type Field, text, optional, numberId } from "./UI";

const localDate = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function AgendaEditor({
  mode,
  editing,
  leadSeed,
  clientSeed,
  properties,
  onClose,
  onCancel,
  onDirty,
}: {
  mode: string;
  editing?: Task | Visit | null;
  leadSeed?: number | null;
  clientSeed?: number;
  properties?: CrmProperty[];
  onClose: () => void;
  onCancel?: () => void;
  onDirty?: () => void;
}) {
  const ctx = useWorkspace();
  const action = useRef<{ fingerprint: string; id: string } | null>(null);
  const isTask = mode === "task";
  const propertyRows = properties || ctx.data.properties;
  const client: Field = {
    name: "client_id",
    label: "Cliente",
    required: !isTask,
    value: editing?.client_id || clientSeed,
    options: ctx.data.clients
      .filter((c) => !clientSeed || c.id === clientSeed)
      .map((c) => ({ value: c.id, label: c.name })),
  };
  const property: Field = {
    name: "property_id",
    label: "Imóvel",
    required: !isTask,
    value: editing?.property_id,
    options: propertyRows.map((p) => ({
      value: p.id,
      label: `${p.property_code} · ${p.title}`,
    })),
  };
  const fields: Field[] = isTask
    ? [
        {
          name: "title",
          label: "Tarefa / retorno",
          required: true,
          value: editing && "title" in editing ? editing.title : "",
        },
        {
          name: "due_at",
          label: "Data e horário",
          type: "datetime-local",
          required: true,
          value:
            editing && "due_at" in editing ? localDate(editing.due_at) : "",
        },
        {
          name: "lead_id",
          label: "Lead relacionado",
          value: editing && "lead_id" in editing ? editing.lead_id : leadSeed,
          options: ctx.data.leads.map((l) => ({ value: l.id, label: l.name })),
        },
        client,
        property,
        {
          name: "description",
          label: "Detalhes",
          type: "textarea",
          value: editing && "description" in editing ? editing.description : "",
        },
      ]
    : [
        client,
        property,
        {
          name: "scheduled_at",
          label: "Data e horário",
          type: "datetime-local",
          required: true,
          value:
            editing && "scheduled_at" in editing
              ? localDate(editing.scheduled_at)
              : "",
        },
        {
          name: "notes",
          label: "Observações",
          type: "textarea",
          value: editing && "notes" in editing ? editing.notes : "",
        },
      ];
  if (ctx.operations && !clientSeed)
    fields.push({
      name: "broker_id",
      label: "Responsável",
      required: true,
      value: editing?.broker_id || ctx.userId,
      options: [
        ...ctx.data.brokers.map((b) => ({ value: b.id, label: b.name })),
        ...(!ctx.data.brokers.some((b) => b.id === ctx.userId)
          ? [{ value: ctx.userId, label: "Minha conta" }]
          : []),
      ],
    });
  async function save(f: FormData) {
    const clientId = clientSeed || numberId(f, "client_id");
    if (
      clientSeed &&
      !ctx.data.clients.some(
        (c) => c.id === clientSeed && c.broker_id === ctx.userId,
      )
    )
      return false;
    const selectedLead = ctx.data.leads.find(
      (l) => l.id === numberId(f, "lead_id"),
    );
    const brokerId = clientSeed
      ? ctx.userId
      : ctx.operations
        ? text(f, "broker_id")
        : ctx.userId;
    // A linked personal client may never be reassigned by a lead's owner.
    if (
      clientSeed &&
      selectedLead?.broker_id &&
      selectedLead.broker_id !== ctx.userId
    ) {
      ctx.setNotice({
        text: "Este lead não pertence à carteira do cliente.",
        error: true,
      });
      return false;
    }
    const date = new Date(text(f, isTask ? "due_at" : "scheduled_at"));
    if (!Number.isFinite(date.valueOf())) {
      ctx.setNotice({ text: "Revise a data e o horário.", error: true });
      return false;
    }
    const payload: Record<string, unknown> = isTask
      ? {
          title: text(f, "title"),
          due_at: date.toISOString(),
          lead_id: numberId(f, "lead_id"),
          client_id: clientId,
          property_id: numberId(f, "property_id"),
          description: optional(f, "description"),
          broker_id: selectedLead?.broker_id || brokerId,
        }
      : {
          client_id: clientId,
          property_id: numberId(f, "property_id"),
          scheduled_at: date.toISOString(),
          notes: optional(f, "notes"),
          broker_id: brokerId,
        };
    const table = isTask ? "tasks" : "visits";
    if (clientSeed && !editing) {
      const fingerprint = JSON.stringify([table, payload]);
      if (action.current?.fingerprint !== fingerprint)
        action.current = { fingerprint, id: crypto.randomUUID() };
      const actionId = action.current.id;
      return ctx.run(async () => {
        const result = await supabase
          .from(table)
          .upsert(
            { ...payload, quick_action_id: actionId },
            { onConflict: "quick_action_id", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
        if (result.error)
          return {
            error: {
              message: ["42703", "PGRST204", "42P10"].includes(
                result.error.code,
              )
                ? "Agenda contextual ainda não habilitada neste ambiente. Aguarde a migration autorizada."
                : "Não foi possível confirmar o agendamento. Seus campos foram preservados.",
            },
          };
        if (result.data) return { error: null };
        const existing = await supabase
          .from(table)
          .select("id")
          .eq("quick_action_id", actionId)
          .single();
        return {
          error: existing.error
            ? {
                message:
                  "Não foi possível confirmar o agendamento nesta sessão.",
              }
            : null,
        };
      }, "Agenda atualizada.");
    }
    return ctx.run(
      () =>
        editing
          ? supabase
              .from(table)
              .update(payload)
              .eq("id", editing.id)
              .select("id")
              .single()
          : supabase.from(table).insert(payload).select("id").single(),
      "Agenda atualizada.",
    );
  }
  return (
    <div onChange={onDirty}>
      <EntityForm
        fields={fields}
        onClose={onClose}
        onCancel={onCancel}
        onSubmit={save}
      />
    </div>
  );
}
