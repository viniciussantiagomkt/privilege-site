"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  assetsForProperty,
  eligibleProperty,
  sharePath,
  type Share,
} from "@/lib/crm/marketing";
import { useWorkspace } from "./Workspace";
import { Modal, Button, Empty } from "./UI";
export function ShareComposer({
  propertyId,
  leadId,
  onClose,
}: {
  propertyId?: number;
  leadId?: number;
  onClose: () => void;
}) {
  const ctx = useWorkspace();
  const [selectedProperty, setProperty] = useState(String(propertyId || ""));
  const [selectedAssets, setAssets] = useState<number[]>([]);
  const [created, setCreated] = useState<Share | null>(null);
  const available = assetsForProperty(
    ctx.data.marketing_assets,
    ctx.data.asset_relations,
    ctx.data.development_units,
    Number(selectedProperty),
  );
  const properties = ctx.data.properties.filter(eligibleProperty);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareError, setShareError] = useState("");
  const url = created ? `${window.location.origin}${sharePath(created)}` : "";
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${created?.message || ""}\n${url}`.trim(),
      );
      setCopied(true);
    } catch {
      setShareError(
        "Não foi possível copiar. Selecione o link abaixo e copie manualmente.",
      );
    }
  }
  async function confirmShare() {
    if (!created) return;
    setSending(true);
    const saved = await ctx.run(
      () =>
        supabase.rpc("crm_confirm_presentation_share", {
          target_share: created.id,
        }),
      "Compartilhamento registrado no atendimento.",
    );
    if (saved) setShareError("");
    setSending(false);
  }
  return (
    <Modal
      title={
        created ? "Sua apresentação está pronta" : "Compartilhar apresentação"
      }
      description="Um link com o imóvel e os materiais aprovados para seu cliente."
      onClose={onClose}
      wide
    >
      {created ? (
        <div className="crm-share-result">
          <p>
            O link foi gerado e registrado no CRM. Confirme o compartilhamento
            depois de enviá-lo ao cliente.
          </p>
          <label>
            Link da apresentação
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <div className="crm-detail-actions">
            <Button onClick={() => void copy()}>
              {copied ? "Copiado" : "Copiar mensagem e link"}
            </Button>
            <a
              className="crm-button secondary"
              target="_blank"
              rel="noreferrer"
              href={url}
            >
              Abrir apresentação
            </a>
            {created.channel === "whatsapp" && (
              <a
                className="crm-button"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent((created.message || "") + "\n" + url)}`}
              >
                Abrir WhatsApp
              </a>
            )}
            {created.lead_id && (
              <Button
                secondary
                disabled={sending || ctx.busy}
                onClick={() => void confirmShare()}
              >
                Confirmar envio ao lead
              </Button>
            )}
          </div>
          {created.channel === "direct" && (
            <p>Copie a mensagem e cole na conversa do Instagram.</p>
          )}
          {shareError && <p role="alert">{shareError}</p>}
        </div>
      ) : (
        <form
          className="crm-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await ctx.run(async () => {
              const days = Number(f.get("days"));
              const { data, error } = await supabase
                .from("marketing_shares")
                .insert({
                  property_ids: [Number(selectedProperty)],
                  asset_ids: selectedAssets.filter((id) =>
                    available.some((a) => a.id === id),
                  ),
                  lead_id: Number(f.get("lead")) || null,
                  client_id: Number(f.get("client")) || null,
                  title: String(f.get("title")).trim(),
                  message: String(f.get("message")).trim(),
                  channel: String(f.get("channel")),
                  expires_at: new Date(
                    Date.now() + days * 86400000,
                  ).toISOString(),
                })
                .select("*")
                .single();
              if (!error) setCreated(data);
              return { error };
            }, "Apresentação gerada.");
          }}
        >
          <fieldset disabled={ctx.busy}>
            <div className="crm-form-grid">
              <label>
                Imóvel
                <select
                  required
                  value={selectedProperty}
                  onChange={(e) => {
                    setProperty(e.target.value);
                    setAssets([]);
                  }}
                >
                  <option value="">Selecione</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.property_code} · {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Título
                <input
                  required
                  name="title"
                  minLength={2}
                  maxLength={160}
                  defaultValue={
                    ctx.data.properties.find((p) => p.id === propertyId)
                      ?.title || "Imóvel selecionado para você"
                  }
                />
              </label>
              <label>
                Lead
                <select name="lead" defaultValue={leadId || ""}>
                  <option value="">Sem vínculo</option>
                  {ctx.data.leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cliente
                <select name="client">
                  <option value="">Sem vínculo</option>
                  {ctx.data.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Canal
                <select name="channel">
                  <option value="copy">Copiar link</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="direct">Instagram Direct</option>
                </select>
              </label>
              <label>
                Validade
                <select name="days" defaultValue="7">
                  {[1, 7, 15, 30, 90].map((n) => (
                    <option key={n} value={n}>
                      {n} dias
                    </option>
                  ))}
                </select>
              </label>
              <label className="full">
                Mensagem
                <textarea
                  name="message"
                  rows={3}
                  maxLength={2000}
                  defaultValue="Olá! Separei uma apresentação deste imóvel para você. No link estão as características e os materiais disponíveis. Qualquer dúvida, estou à disposição."
                />
              </label>
            </div>
            <h3>Materiais aprovados</h3>
            <p>
              As fotos e características do imóvel já fazem parte da
              apresentação.
            </p>
            <div className="crm-material-selection">
              {available.map((a) => (
                <label key={a.id}>
                  <input
                    type="checkbox"
                    checked={selectedAssets.includes(a.id)}
                    onChange={(e) =>
                      setAssets(
                        e.target.checked
                          ? [...selectedAssets, a.id]
                          : selectedAssets.filter((id) => id !== a.id),
                      )
                    }
                  />
                  <span>
                    {a.title}
                    <small>{a.category}</small>
                  </span>
                </label>
              ))}
            </div>
            {!available.length && (
              <p>Nenhum material adicional aprovado para este imóvel.</p>
            )}
            {!properties.length && (
              <Empty
                title="Nenhum imóvel elegível"
                description="A gestão precisa aprovar, publicar e habilitar a apresentação de um imóvel."
              />
            )}
            <div className="crm-form-actions">
              <Button secondary onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={ctx.busy || !selectedProperty}>
                Gerar apresentação
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
