"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  FileImage,
  Link2,
  FolderHeart,
  HardDrive,
  Upload,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, type Asset } from "@/lib/crm/marketing";
import { dateTime, matches } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import {
  PageHeading,
  SectionState,
  Metric,
  Panel,
  Badge,
  Button,
  Empty,
  Modal,
  EntityForm,
  text,
  optional,
  numberId,
  type Field,
} from "./UI";
import {
  AssetAudience,
  AudienceFields,
  AssetRecipientSummary,
} from "./AssetAudience";
import { Collections } from "./Collections";
import { ShareComposer } from "./ShareComposer";
export function Marketing() {
  const ctx = useWorkspace();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [property, setProperty] = useState("");
  const [development, setDevelopment] = useState("");
  const [collection, setCollection] = useState("");
  const [upload, setUpload] = useState<Asset | "new" | null>(null);
  const [editRecord, setEdit] = useState<Asset | null>(null);
  const edit =
    ctx.data.marketing_assets.find((a) => a.id === editRecord?.id) || null;
  const openedMaterial = useRef<number | null>(null);
  useEffect(() => {
    const id = Number(
      new URLSearchParams(window.location.search).get("material"),
    );
    const record = ctx.data.marketing_assets.find((a) => a.id === id);
    if (record && openedMaterial.current !== id) {
      openedMaterial.current = id;
      queueMicrotask(() => setEdit(record));
    }
  }, [ctx.data.marketing_assets]);
  const [manageCollections, setManageCollections] = useState(false);
  const [newCollection, setNewCollection] = useState(false);
  const [share, setShare] = useState(false);
  const [period, setPeriod] = useState("30");
  const [broker, setBroker] = useState("");
  const [preview, setPreview] = useState<{
    url: string;
    title: string;
    mime: string;
  } | null>(null);
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);
  const favoriteIds = ctx.data.marketing_favorites
    .filter((f) => f.owner_id === ctx.userId)
    .map((f) => f.asset_id);
  const now = ctx.updatedAt?.getTime() || 0;
  const expired = (a: Asset) =>
    !!a.expires_at && new Date(a.expires_at).getTime() <= now;
  const assets = ctx.data.marketing_assets.filter(
    (a) =>
      matches(ctx.query, a.title, a.description, a.tags.join(" ")) &&
      (!category || a.category === category) &&
      (!status || (status === "vencido" ? expired(a) : a.status === status)) &&
      (!favorites || favoriteIds.includes(a.id)) &&
      (!property ||
        ctx.data.asset_relations.some(
          (r) =>
            r.asset_id === a.id &&
            (r.property_id === Number(property) ||
              ctx.data.development_units.some(
                (u) =>
                  u.property_id === Number(property) &&
                  u.development_id === r.development_id,
              )),
        )) &&
      (!development ||
        ctx.data.asset_relations.some(
          (r) =>
            r.asset_id === a.id && r.development_id === Number(development),
        )) &&
      (!collection ||
        ctx.data.marketing_collection_items.some(
          (i) => i.collection_id === Number(collection) && i.asset_id === a.id,
        )),
  );
  const cutoff = period ? now - Number(period) * 86400000 : 0;
  const shares = ctx.data.marketing_shares.filter(
    (s) =>
      new Date(s.created_at).getTime() >= cutoff &&
      (!broker || s.owner_id === broker),
  );
  const events = ctx.data.marketing_share_events.filter(
    (e) =>
      shares.some((s) => s.id === e.share_id) &&
      new Date(e.created_at).getTime() >= cutoff,
  );
  const storage = ctx.data.asset_versions.reduce((n, v) => n + v.size_bytes, 0);
  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }
  async function openAsset(a: Asset) {
    const v = ctx.data.asset_versions.find(
      (v) => v.id === a.current_version_id,
    );
    if (!v) return;
    await ctx.run(async () => {
      const { data, error } = await supabase.storage
        .from("crm-marketing")
        .download(v.storage_path);
      if (data) {
        closePreview();
        setPreview({
          url: URL.createObjectURL(data),
          title: a.title,
          mime: v.mime_type,
        });
      }
      return { error };
    }, "Material carregado.");
  }
  const fields: Field[] = [
    { name: "title", label: "Título", required: true, value: edit?.title },
    {
      name: "category",
      label: "Categoria",
      required: true,
      value: edit?.category || "foto",
      options: CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    {
      name: "tags",
      label: "Tags separadas por vírgula",
      value: edit?.tags.join(", "),
    },
    {
      name: "expires_at",
      label: "Validade",
      type: "datetime-local",
      value: edit?.expires_at
        ? new Date(
            new Date(edit.expires_at).getTime() -
              new Date().getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    },
    {
      name: "description",
      label: "Descrição",
      type: "textarea",
      value: edit?.description,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Materiais que ajudam a vender"
        title="Central de Marketing"
        description="Encontre o material certo, organize suas coleções e apresente imóveis em um único link."
        action={
          <>
            <Button secondary onClick={() => setManageCollections(true)}>
              Meus kits
            </Button>
            <Button secondary onClick={() => setNewCollection(true)}>
              Nova coleção
            </Button>
            <Button onClick={() => setUpload("new")}>
              <Upload size={16} />
              Importar materiais
            </Button>
            <Button secondary onClick={() => setShare(true)}>
              Criar apresentação
            </Button>
          </>
        }
      />
      <SectionState
        tables={[
          "marketing_assets",
          "asset_versions",
          "asset_relations",
          "marketing_shares",
          "marketing_share_events",
          "marketing_collections",
          "marketing_favorites",
        ]}
      >
        <div className="crm-toolbar">
          <select
            aria-label="Período do marketing"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="">Todo o período</option>
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                Últimos {d} dias
              </option>
            ))}
          </select>
          {ctx.operations && (
            <select
              aria-label="Corretor do marketing"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
            >
              <option value="">Toda a equipe</option>
              {ctx.data.brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="crm-metrics">
          <Metric
            label="Materiais disponíveis"
            value={ctx.data.marketing_assets.length}
            detail={`${ctx.data.marketing_assets.filter((a) => a.status === "aprovado" && !expired(a)).length} aprovados · ${ctx.data.marketing_assets.filter(expired).length} vencidos`}
            icon={<FileImage size={20} />}
          />
          <Metric
            label="Apresentações geradas"
            value={shares.length}
            detail="No período e corretor selecionados"
            icon={<Link2 size={20} />}
          />
          <Metric
            label="Acessos autorizados"
            value={events.length}
            detail="Aberturas registradas com consentimento"
            icon={<FolderHeart size={20} />}
          />
          <Metric
            label="Arquivos cadastrados"
            value={`${(storage / 1048576).toFixed(1)} MB`}
            detail="Versões visíveis à sua conta"
            icon={<HardDrive size={20} />}
          />
        </div>
        <div className="crm-toolbar">
          <select
            aria-label="Categoria de material"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Status de material"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {["pendente", "aprovado", "arquivado", "vencido"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Imóvel dos materiais"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
          >
            <option value="">Todos os imóveis</option>
            {ctx.data.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.property_code} · {p.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Empreendimento dos materiais"
            value={development}
            onChange={(e) => setDevelopment(e.target.value)}
          >
            <option value="">Todos os empreendimentos</option>
            {ctx.data.developments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Coleção de materiais"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            <option value="">Todas as coleções</option>
            {ctx.data.marketing_collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button secondary onClick={() => setFavorites(!favorites)}>
            <Star size={15} />
            {favorites ? "Mostrar todos" : "Favoritos"}
          </Button>
        </div>
        {assets.length ? (
          <div className="crm-marketing-grid">
            {assets.map((a) => (
              <article className="crm-panel crm-material-card" key={a.id}>
                <div className="crm-material-cover">
                  <FileImage size={35} />
                  <Badge>{a.category}</Badge>
                </div>
                <div className="crm-material-body">
                  <h3>{a.title}</h3>
                  <p>
                    {a.description ||
                      a.tags.join(" · ") ||
                      "Material comercial"}
                  </p>
                  <Badge
                    tone={
                      expired(a)
                        ? "amber"
                        : a.status === "aprovado"
                          ? "green"
                          : "muted"
                    }
                  >
                    {expired(a) ? "Vencido" : a.status} ·{" "}
                    {a.visibility === "public"
                      ? "Divulgação autorizada"
                      : "Uso interno"}
                  </Badge>
                  <small>
                    {a.scope === "institutional" ? "Institucional" : "Pessoal"}{" "}
                    · {dateTime(a.created_at)}
                  </small>
                  <div className="crm-detail-actions">
                    <Button
                      secondary
                      disabled={ctx.busy || !a.current_version_id}
                      onClick={() => void openAsset(a)}
                    >
                      Visualizar
                    </Button>
                    <Button
                      secondary
                      disabled={ctx.busy}
                      onClick={() =>
                        void ctx.run(() =>
                          favoriteIds.includes(a.id)
                            ? supabase
                                .from("marketing_favorites")
                                .delete()
                                .eq("owner_id", ctx.userId)
                                .eq("asset_id", a.id)
                            : supabase
                                .from("marketing_favorites")
                                .insert({ asset_id: a.id }),
                        )
                      }
                    >
                      <Star size={14} />
                      {favoriteIds.includes(a.id)
                        ? "Remover favorito"
                        : "Favoritar"}
                    </Button>
                    {(ctx.operations || a.owner_id === ctx.userId) && (
                      <Button secondary onClick={() => setEdit(a)}>
                        Editar e vincular
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Panel title="Biblioteca de materiais">
            <Empty
              title="Nenhum material encontrado"
              description="Importe fotos, plantas, vídeos ou PDFs. A divulgação só fica disponível após aprovação da gestão."
            />
          </Panel>
        )}
        <Panel
          title="Imóveis mais apresentados"
          description="Links gerados no período selecionado e envios confirmados pelo corretor."
        >
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Imóvel</th>
                  <th>Links gerados</th>
                  <th>Envios confirmados</th>
                </tr>
              </thead>
              <tbody>
                {ctx.data.properties
                  .map((p) => ({
                    p,
                    links: shares.filter((s) => s.property_ids.includes(p.id)),
                  }))
                  .filter((row) => row.links.length > 0)
                  .sort((a, b) => b.links.length - a.links.length)
                  .slice(0, 8)
                  .map(({ p, links }) => (
                    <tr key={p.id}>
                      <td>
                        {p.property_code} · {p.title}
                      </td>
                      <td>{links.length}</td>
                      <td>
                        {
                          links.filter((s) =>
                            ctx.data.crm_event_log.some(
                              (e) =>
                                e.entity_id === s.id &&
                                e.event_type === "presentation_shared",
                            ),
                          ).length
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!shares.length && (
              <Empty
                title="Nenhum link gerado neste período"
                description="Os imóveis apresentados aparecerão aqui."
              />
            )}
          </div>
        </Panel>
        <Panel
          title="Importações recentes"
          description="Resultado de cada arquivo, incluindo duplicações e falhas."
        >
          {ctx.data.asset_imports.length ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Resultado</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.data.asset_imports
                    .slice(-20)
                    .reverse()
                    .map((i) => (
                      <tr key={i.id}>
                        <td>{i.file_name}</td>
                        <td>
                          <Badge>{i.status}</Badge>
                        </td>
                        <td>{i.error_message || "Registrado"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="crm-panel-padding">Nenhuma importação registrada.</p>
          )}
        </Panel>
      </SectionState>
      {manageCollections && (
        <Collections onClose={() => setManageCollections(false)} />
      )}
      {share && <ShareComposer onClose={() => setShare(false)} />}
      {preview && (
        <Modal title={preview.title} onClose={closePreview} wide>
          {preview.mime.startsWith("image/") ? (
            <Image
              src={preview.url}
              alt={preview.title}
              width={1200}
              height={800}
              unoptimized
              className="crm-asset-preview"
            />
          ) : preview.mime === "application/pdf" ? (
            <iframe
              title={preview.title}
              src={preview.url}
              className="crm-pdf-preview"
            />
          ) : (
            <video src={preview.url} controls className="crm-asset-preview" />
          )}
          <a className="crm-button" download={preview.title} href={preview.url}>
            Baixar material
          </a>
        </Modal>
      )}
      {newCollection && (
        <Modal
          title="Nova coleção pessoal"
          onClose={() => setNewCollection(false)}
        >
          <EntityForm
            fields={[
              { name: "name", label: "Nome", required: true },
              { name: "description", label: "Descrição", type: "textarea" },
            ]}
            onClose={() => setNewCollection(false)}
            onSubmit={(f) =>
              ctx.run(() =>
                supabase.from("marketing_collections").insert({
                  name: text(f, "name"),
                  description: optional(f, "description"),
                }),
              )
            }
          />
        </Modal>
      )}
      {upload && (
        <UploadMaterials
          asset={upload === "new" ? null : upload}
          onClose={() => setUpload(null)}
        />
      )}
      {edit && !(ctx.operations || edit.owner_id === ctx.userId) && (
        <Modal
          title={edit.title}
          description={`Material compartilhado · ${edit.status}`}
          onClose={() => setEdit(null)}
        >
          <p>{edit.description}</p>
          <Button
            disabled={ctx.busy || !edit.current_version_id}
            onClick={() => {
              const material = edit;
              setEdit(null);
              void openAsset(material);
            }}
          >
            Visualizar arquivo
          </Button>
        </Modal>
      )}
      {edit && (ctx.operations || edit.owner_id === ctx.userId) && (
        <Modal
          title="Editar material"
          description="Mudanças no arquivo exigem nova aprovação. Vincule o material antes de compartilhá-lo."
          onClose={() => setEdit(null)}
          wide
        >
          <EntityForm
            fields={fields}
            onClose={() => setEdit(null)}
            onSubmit={(f) =>
              ctx.run(() =>
                supabase
                  .from("marketing_assets")
                  .update({
                    title: text(f, "title"),
                    category: text(f, "category"),
                    tags: text(f, "tags")
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                    description: optional(f, "description"),
                    expires_at: text(f, "expires_at")
                      ? new Date(text(f, "expires_at")).toISOString()
                      : null,
                  })
                  .eq("id", edit.id)
                  .select("id")
                  .single(),
              )
            }
          />
          <AssetRecipientSummary
            key={`${edit.id}:${edit.updated_at}`}
            asset={edit}
          />
          <div className="crm-detail-actions">
            <Button
              secondary
              onClick={() => {
                setUpload(edit);
                setEdit(null);
              }}
            >
              Enviar nova versão
            </Button>
            {ctx.operations && (
              <Button
                disabled={ctx.busy || !edit.current_version_id}
                onClick={() =>
                  void ctx.run(
                    () =>
                      supabase
                        .from("marketing_assets")
                        .update({ status: "aprovado", visibility: "internal" })
                        .eq("id", edit.id)
                        .eq("status", "pendente")
                        .eq("current_version_id", edit.current_version_id)
                        .select("id")
                        .single(),
                    "Material aprovado. Acesso liberado conforme a audiência; publicação na internet é uma ação separada.",
                  )
                }
              >
                Confirmar aprovação para a audiência
              </Button>
            )}
            <Button
              secondary
              disabled={ctx.busy}
              onClick={() =>
                void ctx.run(() =>
                  supabase
                    .from("marketing_assets")
                    .update({ status: "arquivado", visibility: "internal" })
                    .eq("id", edit.id)
                    .select("id")
                    .single(),
                )
              }
            >
              Arquivar material
            </Button>
          </div>
          {edit.owner_id === ctx.userId && (
            <AssetAudience key={`${edit.id}:${edit.updated_at}`} asset={edit} />
          )}
          {ctx.operations &&
            edit.scope === "institutional" &&
            edit.audience === "team" &&
            edit.status === "aprovado" &&
            edit.visibility !== "public" && (
              <Button
                secondary
                disabled={ctx.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Autorizar uso deste material em apresentações públicas de imóveis? Isso permite acesso sem login quando houver vínculo com imóvel público.",
                    )
                  )
                    void ctx.run(
                      () =>
                        supabase
                          .from("marketing_assets")
                          .update({ visibility: "public" })
                          .eq("id", edit.id)
                          .eq("status", "aprovado")
                          .eq("current_version_id", edit.current_version_id)
                          .select("id")
                          .single(),
                      "Divulgação em apresentações públicas autorizada.",
                    );
                }}
              >
                Autorizar apresentações públicas
              </Button>
            )}
          <MaterialRelations asset={edit} />
        </Modal>
      )}
    </>
  );
}
function MaterialRelations({ asset }: { asset: Asset }) {
  const ctx = useWorkspace();
  const relations = ctx.data.asset_relations.filter(
    (r) => r.asset_id === asset.id,
  );
  return (
    <>
      <h3>Vínculos e coleções</h3>
      {relations.map((r) => (
        <div className="crm-notification-row" key={r.id}>
          <p>
            {r.property_id
              ? ctx.data.properties.find((p) => p.id === r.property_id)?.title
              : ctx.data.developments.find((d) => d.id === r.development_id)
                  ?.name}
          </p>
          <Button
            secondary
            disabled={ctx.busy}
            onClick={() =>
              void ctx.run(() =>
                supabase
                  .from("asset_relations")
                  .delete()
                  .eq("id", r.id)
                  .select("id")
                  .single(),
              )
            }
          >
            Remover vínculo
          </Button>
        </div>
      ))}
      <EntityForm
        fields={[
          {
            name: "property",
            label: "Imóvel",
            options: ctx.data.properties.map((p) => ({
              value: p.id,
              label: `${p.property_code} · ${p.title}`,
            })),
          },
          ...(ctx.operations
            ? [
                {
                  name: "development",
                  label: "Empreendimento",
                  options: ctx.data.developments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  })),
                },
              ]
            : []),
        ]}
        onClose={() => {}}
        onSubmit={(f) =>
          ctx.run(async () => {
            const property_id = numberId(f, "property"),
              development_id = numberId(f, "development");
            if (
              (!property_id && !development_id) ||
              (property_id && development_id)
            )
              return {
                error: {
                  message:
                    "Selecione um imóvel ou um empreendimento por vínculo.",
                },
              };
            return await supabase
              .from("asset_relations")
              .insert({ asset_id: asset.id, property_id, development_id });
          })
        }
      />
      <EntityForm
        fields={[
          {
            name: "collection",
            label: "Adicionar à coleção",
            required: true,
            options: ctx.data.marketing_collections.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          },
        ]}
        onClose={() => {}}
        onSubmit={(f) =>
          ctx.run(() =>
            supabase.from("marketing_collection_items").insert({
              asset_id: asset.id,
              collection_id: numberId(f, "collection"),
            }),
          )
        }
      />
      {ctx.data.marketing_collection_items
        .filter((i) => i.asset_id === asset.id)
        .map((i) => (
          <div className="crm-notification-row" key={i.id}>
            <span>
              {
                ctx.data.marketing_collections.find(
                  (c) => c.id === i.collection_id,
                )?.name
              }
            </span>
            <Button
              secondary
              disabled={ctx.busy}
              onClick={() =>
                void ctx.run(() =>
                  supabase
                    .from("marketing_collection_items")
                    .delete()
                    .eq("id", i.id)
                    .select("id")
                    .single(),
                )
              }
            >
              Retirar da coleção
            </Button>
          </div>
        ))}
    </>
  );
}
function UploadMaterials({
  asset,
  onClose,
}: {
  asset: Asset | null;
  onClose: () => void;
}) {
  const ctx = useWorkspace();
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState(false);
  return (
    <Modal
      title={asset ? "Nova versão do material" : "Importar materiais"}
      description="JPG, PNG, WebP, PDF ou MP4. Até 50 MB por arquivo e 20 arquivos por lote."
      onClose={onClose}
    >
      <form
        className="crm-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const files = f
            .getAll("files")
            .filter((v): v is File => v instanceof File && v.size > 0);
          let failures = 0;
          const saved = await ctx.run(async () => {
            if (
              !files.length ||
              files.length > 20 ||
              (asset && files.length !== 1)
            )
              return {
                error: {
                  message:
                    "Selecione até 20 arquivos, ou um arquivo para substituir uma versão.",
                },
              };
            if (
              !asset &&
              (f.get("audienceReady") !== "yes" ||
                (f.get("audience") === "selected" &&
                  !f.getAll("recipient").length))
            )
              return {
                error: {
                  message:
                    "Carregue o diretório e selecione os destinatários antes de importar.",
                },
              };
            for (const [index, file] of files.entries()) {
              setProgress(`${index + 1}/${files.length} · ${file.name}`);
              let assetId: number | null = asset?.id || null;
              try {
                const ext: Record<string, string> = {
                  "image/jpeg": "jpg",
                  "image/png": "png",
                  "image/webp": "webp",
                  "application/pdf": "pdf",
                  "video/mp4": "mp4",
                };
                if (!ext[file.type] || file.size > 52428800)
                  throw new Error("Tipo inválido ou arquivo acima de 50 MB.");
                const checksum = Array.from(
                  new Uint8Array(
                    await crypto.subtle.digest(
                      "SHA-256",
                      await file.arrayBuffer(),
                    ),
                  ),
                )
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");
                const { data: duplicates, error: duplicateError } =
                  await supabase
                    .from("asset_versions")
                    .select("asset_id")
                    .eq("checksum", checksum)
                    .limit(1);
                if (duplicateError) throw duplicateError;
                if (duplicates?.length) {
                  const { error } = await supabase
                    .from("asset_imports")
                    .insert({
                      file_name: file.name,
                      status: "duplicate",
                      asset_id: duplicates[0].asset_id,
                    });
                  if (error) throw error;
                  continue;
                }
                if (!assetId) {
                  const { data, error } = await supabase
                    .from("marketing_assets")
                    .insert({
                      title: file.name.slice(0, 160).padEnd(2, " "),
                      category:
                        file.type === "application/pdf"
                          ? "pdf"
                          : file.type === "video/mp4"
                            ? "video"
                            : "foto",
                      scope: "personal",
                      audience: "owner",
                    })
                    .select("id")
                    .single();
                  if (error) throw error;
                  assetId = data.id;
                }
                const path = `${ctx.userId}/${crypto.randomUUID()}.${ext[file.type]}`;
                const { error: uploadError } = await supabase.storage
                  .from("crm-marketing")
                  .upload(path, file, {
                    upsert: false,
                    contentType: file.type,
                  });
                if (uploadError) throw uploadError;
                const { data: version, error: versionError } = await supabase
                  .from("asset_versions")
                  .insert({
                    asset_id: assetId,
                    storage_path: path,
                    mime_type: file.type,
                    size_bytes: file.size,
                    checksum,
                    original_name: file.name.slice(0, 255),
                  })
                  .select("id")
                  .single();
                if (versionError) throw versionError;
                const { error: updateError } = await supabase
                  .from("marketing_assets")
                  .update({ current_version_id: version.id })
                  .eq("id", assetId)
                  .select("id")
                  .single();
                if (updateError) throw updateError;
                if (!asset && f.get("audience") !== "owner") {
                  const { error: audienceError } = await supabase.rpc(
                    "crm_set_asset_audience",
                    {
                      target_asset: assetId,
                      new_audience: String(f.get("audience")),
                      recipients:
                        f.get("audience") === "selected"
                          ? f.getAll("recipient")
                          : [],
                    },
                  );
                  if (audienceError)
                    throw new Error(
                      `Arquivo preservado. Compartilhamento não concluído: ${audienceError.message}. Edite a audiência para tentar novamente.`,
                    );
                }
                const { error: importError } = await supabase
                  .from("asset_imports")
                  .insert({
                    file_name: file.name,
                    status: "uploaded",
                    asset_id: assetId,
                  });
                if (importError) throw importError;
              } catch (err) {
                failures++;
                const message =
                  err instanceof Error
                    ? err.message
                    : (err as { message?: string })?.message ||
                      "Falha na importação";
                const { error: logError } = await supabase
                  .from("asset_imports")
                  .insert({
                    file_name: file.name,
                    status: "failed",
                    asset_id: assetId,
                    error_message: message,
                  });
                if (logError)
                  throw new Error(
                    `${message} Não foi possível registrar a falha: ${logError.message}`,
                  );
              }
            }
            setDone(true);
            return {
              error: failures
                ? {
                    message: `${failures} arquivo(s) falharam. Confira o histórico de importações. Os demais foram preservados.`,
                  }
                : null,
            };
          }, "Importação concluída. Os materiais aguardam aprovação.");
          if (saved) setProgress("Lote concluído.");
        }}
      >
        <fieldset disabled={ctx.busy || done}>
          <label>
            Arquivos
            <input
              name="files"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
              multiple={!asset}
              required
            />
          </label>
          {!asset && <AudienceFields />}
          <p role="status">{progress}</p>
          {ctx.notice && (
            <p role={ctx.notice.error ? "alert" : "status"}>
              {ctx.notice.text}
            </p>
          )}
          <div className="crm-form-actions">
            <Button secondary onClick={onClose}>
              Fechar
            </Button>
            <Button type="submit" disabled={ctx.busy || done}>
              Importar
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
