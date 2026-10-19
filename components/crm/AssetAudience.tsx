"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/lib/crm/marketing";
import { useWorkspace } from "./Workspace";
import { Button, Panel } from "./UI";
export function AssetAudience({ asset }: { asset: Asset }) {
  const ctx = useWorkspace();
  const [audience, setAudience] = useState(asset.audience || "owner");
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
  return (
    <Panel
      title="Audiência do material"
      description="Mudar a audiência retira a aprovação e exige nova revisão. Apenas materiais institucionais aprovados para equipe podem entrar no link público."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await ctx.run(
            () =>
              supabase.rpc("crm_set_asset_audience", {
                target_asset: asset.id,
                new_audience: audience,
                recipients:
                  audience === "selected" ? f.getAll("recipient") : [],
              }),
            "Audiência atualizada. Material aguardando nova aprovação.",
          );
        }}
      >
        <label>
          Destinatários{" "}
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
          >
            <option value="owner">Somente proprietário</option>
            <option value="team">Equipe</option>
            <option value="selected">Corretores selecionados</option>
          </select>
        </label>
        {audience === "selected" && (
          <fieldset>
            <legend>
              Selecione os destinatários novamente ao alterar a audiência
            </legend>
            {candidates.map((b) => (
              <label key={b.id}>
                <input type="checkbox" name="recipient" value={b.id} />
                {b.name}
              </label>
            ))}
          </fieldset>
        )}
        {error && <p role="alert">{error}</p>}
        <Button
          type="submit"
          disabled={ctx.busy || (audience === "selected" && !!error)}
        >
          Alterar audiência e solicitar revisão
        </Button>
      </form>
    </Panel>
  );
}
