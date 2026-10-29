"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/lib/crm/marketing";
import { useWorkspace } from "./Workspace";
import { Button, Panel } from "./UI";
export function AudienceFields({
  initial = "owner",
  assetId,
}: {
  initial?: string;
  assetId?: number;
}) {
  const ctx = useWorkspace();
  const [audience, setAudience] = useState(initial);
  const [candidates, setCandidates] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      const [directory, current] = await Promise.all([
        supabase.rpc("crm_marketing_recipients"),
        assetId
          ? supabase
              .from("marketing_asset_recipients")
              .select("user_id")
              .eq("asset_id", assetId)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      setCandidates(directory.error ? [] : directory.data || []);
      setSelected(current.data?.map((r) => r.user_id) || []);
      setError(
        directory.error || current.error
          ? "Não foi possível carregar os destinatários. A atualização do banco é necessária ou ocorreu uma falha de acesso. Tente novamente após atualizar a página."
          : "",
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [ctx.userId, assetId]);
  return (
    <fieldset className="crm-audience-fields" disabled={ctx.busy || loading}>
      <label>
        Quem pode acessar?
        <select
          name="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        >
          <option value="owner">Somente eu</option>
          <option value="team">Toda a equipe</option>
          <option value="selected">Selecionar destinatários</option>
        </select>
      </label>
      {audience === "team" && (
        <p>
          Administradores, gestores e corretores ativos poderão acessar após
          aprovação. Compartilhar com a equipe não publica o arquivo na
          internet.
        </p>
      )}
      {audience === "selected" && (
        <fieldset className="crm-audience-recipients">
          <legend>Destinatários atuais</legend>
          {candidates.map((m) => (
            <label className="crm-audience-recipient" key={m.id}>
              <input
                type="checkbox"
                name="recipient"
                value={m.id}
                checked={selected.includes(m.id)}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, m.id]
                      : old.filter((id) => id !== m.id),
                  )
                }
              />
              <span>{m.name}<small>
              {m.role === "admin"
                ? "Administrador"
                : m.role === "manager"
                  ? "Gestor"
                  : "Corretor"}</small></span>
            </label>
          ))}
        </fieldset>
      )}
      <p>
        Você conserva acesso ao próprio material. Mudanças de audiência exigem
        nova aprovação. A gestão pode revisar materiais enviados para
        compartilhamento.
      </p>
      {loading && <p role="status">Carregando destinatários…</p>}
      {error && <p role="alert">{error}</p>}
      <input
        type="hidden"
        name="audienceReady"
        value={!loading && !error ? "yes" : "no"}
      />
    </fieldset>
  );
}
export function AssetAudience({ asset }: { asset: Asset }) {
  const ctx = useWorkspace();
  return (
    <Panel
      title="Compartilhamento do material"
      description={`Estado atual: ${asset.status}. Audiência: ${asset.audience === "team" ? "Toda a equipe" : asset.audience === "selected" ? "Destinatários selecionados" : "Somente eu"}.`}
    >
      {ctx.notice && (
        <p role={ctx.notice.error ? "alert" : "status"}>{ctx.notice.text}</p>
      )}
      <form
        className="crm-audience-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const audience = String(f.get("audience"));
          if (
            f.get("audienceReady") !== "yes" ||
            (audience === "selected" && !f.getAll("recipient").length)
          ) {
            ctx.setNotice({
              text: "Aguarde o diretório e selecione ao menos um destinatário.",
              error: true,
            });
            return;
          }
          await ctx.run(
            () =>
              supabase.rpc("crm_set_asset_audience", {
                target_asset: asset.id,
                new_audience: audience,
                recipients:
                  audience === "selected" ? f.getAll("recipient") : [],
              }),
            "Audiência salva. Se houve mudança, o material aguarda nova aprovação da gestão.",
          );
        }}
      >
        <AudienceFields initial={asset.audience} assetId={asset.id} />
        <Button type="submit" disabled={ctx.busy}>
          Salvar audiência e solicitar aprovação
        </Button>
      </form>
      {asset.audience !== "owner" && asset.status !== "aprovado" && (
        <Button
          secondary
          disabled={ctx.busy || !asset.current_version_id}
          onClick={() =>
            void ctx.run(
              () =>
                supabase.rpc("crm_submit_asset_review", {
                  target_asset: asset.id,
                }),
              "Solicitação de aprovação registrada para a gestão.",
            )
          }
        >
          Solicitar aprovação da audiência atual
        </Button>
      )}
    </Panel>
  );
}

export function AssetRecipientSummary({ asset }: { asset: Asset }) {
  const [labels, setLabels] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (asset.audience !== "selected") return;
    void Promise.all([
      supabase.rpc("crm_marketing_recipients"),
      supabase
        .from("marketing_asset_recipients")
        .select("user_id")
        .eq("asset_id", asset.id),
    ]).then(([directory, current]) => {
      if (!active) return;
      setError(
        directory.error || current.error
          ? "Não foi possível conferir os destinatários."
          : "",
      );
      const ids = new Set(current.data?.map((r) => r.user_id));
      setLabels(
        (directory.data || [])
          .filter((m: { id: string }) => ids.has(m.id))
          .map((m: { name: string; role: string }) => `${m.name} (${m.role === "admin" ? "Administrador" : m.role === "manager" ? "Gestor" : "Corretor"})`),
      );
    });
    return () => {
      active = false;
    };
  }, [asset.id, asset.audience]);
  return (
    <p>
      {asset.audience === "team"
        ? "Audiência: toda a equipe ativa."
        : asset.audience === "selected"
          ? `Destinatários selecionados: ${error || labels.join(", ") || "carregando…"}`
          : "Audiência: somente proprietário."}
    </p>
  );
}
