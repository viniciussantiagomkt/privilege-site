"use client";
import { useEffect, useRef } from "react";
import { recordId, canAddWork } from "@/lib/crm/broker-workspace";
import { useWorkspace } from "./Workspace";

// Open the existing editor only after its normal, RLS-scoped module has loaded.
export function useEntityIntent(
  actions: Record<string, (id: number | null) => boolean>,
) {
  const ctx = useWorkspace();
  const consumed = useRef("");
  useEffect(() => {
    if (ctx.loading || ctx.refreshing || !ctx.userId) return;
    const key = `${ctx.userId}:${ctx.role}:${ctx.routeSearch}`;
    if (consumed.current === key) return;
    const params = new URLSearchParams(ctx.routeSearch);
    const create = params.get("novo");
    const entry = create
      ? ([`new:${create}`, null] as const)
      : Object.entries(actions)
          .filter(([name]) => !name.startsWith("new:"))
          .map(([name]) => [name, recordId(params.get(name))] as const)
          .find(([, id]) => id !== null);
    if (!entry) return;
    const frame = requestAnimationFrame(() => {
      consumed.current = key;
      if (
        Object.keys(ctx.errors).length ||
        !canAddWork(ctx.role, ctx.userId) ||
        !actions[entry[0]]?.(entry[1])
      ) {
        ctx.setNotice({
          text: "Este registro ou ação não está disponível na lista autorizada. Atualize os dados ou use a tela especializada.",
          error: true,
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ctx, actions]);
}
