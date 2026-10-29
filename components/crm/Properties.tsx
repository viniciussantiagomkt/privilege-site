"use client";
import Image from "next/image";
import { eligibleProperty } from "@/lib/crm/marketing";
import { ShareComposer } from "./ShareComposer";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  LayoutGrid,
  List,
  MapPin,
  BedDouble,
  Maximize,
  Car,
  ExternalLink,
  Check,
  EyeOff,
  Archive,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PropertyForm } from "@/components/PropertyForm";
import { useWorkspace } from "./Workspace";
import {
  PageHeading,
  SectionState,
  NewButton,
  Empty,
  Badge,
  Modal,
  Button,
  EntityForm,
  numberId,
  text,
  type Field,
} from "./UI";
import { matches, type CrmProperty, dateTime } from "@/lib/crm/model";
export function PrivateThumbnail({
  url,
  title,
}: {
  url: string | undefined;
  title: string;
}) {
  const [signed, setSigned] = useState("");
  useEffect(() => {
    let active = true;
    const path = url?.split("/api/property-media/")[1];
    if (!path) return;
    async function refresh() {
      const { data } = await supabase.storage
        .from("crm-property-images")
        .createSignedUrl(path!, 60);
      if (active) setSigned(data?.signedUrl || "");
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 45000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [url]);
  const src = url?.includes("/api/property-media/") ? signed : url;
  return src ? (
    <Image src={src} alt={title} width={500} height={320} unoptimized />
  ) : (
    <Building2 size={40} strokeWidth={1} />
  );
}
export function Properties() {
  const ctx = useWorkspace();
  const [shareProperty, setShareProperty] = useState<number | null>(null);
  const [view, setView] = useState("cards");
  const [filter, setFilter] = useState("");
  const [scope, setScope] = useState("");
  const [edit, setEdit] = useState<CrmProperty | null>(null);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<CrmProperty | null>(null);
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (openedFromLink.current) return;
    const id = Number(new URLSearchParams(window.location.search).get("imovel"));
    const frame = requestAnimationFrame(() => { const property = ctx.data.properties.find(p => p.id === id); if (property) { openedFromLink.current = true; setSelected(property); } });
    return () => cancelAnimationFrame(frame);
  }, [ctx.data.properties]);
  const [archive, setArchive] = useState<CrmProperty | null>(null);
  const properties = ctx.data.properties.filter(
    (p) =>
      matches(ctx.query, p.title, p.property_code, p.location, p.category) &&
      (!scope || p.broker_id === ctx.userId || p.owner_id === ctx.userId) &&
      (!filter || p.workflow_status === filter || p.status === filter),
  );
  const canEdit = (p: CrmProperty) =>
    ctx.operations || p.owner_id === ctx.userId || p.broker_id === ctx.userId;
  function saved() {
    setEdit(null);
    setCreate(false);
    void ctx.reload();
    ctx.setNotice({ text: "Cadastro salvo. Novos imóveis ficam em rascunho; abra o imóvel e envie para aprovação para notificar a gestão.", error: false });
  }
  async function approve(p: CrmProperty) {
    await ctx.run(
      () =>
        supabase
          .from("properties")
          .update({
            workflow_status: "aprovado",
            approved_by: ctx.userId,
            approved_at: new Date().toISOString(),
            publish_on_site: false,
          })
          .eq("id", p.id)
          .select("id")
          .single(),
      "Imóvel aprovado. Escolha quando publicar no site.",
    );
  }
  async function publish(p: CrmProperty) {
    await ctx.run(
      () =>
        supabase
          .from("properties")
          .update({ publish_on_site: !p.publish_on_site })
          .eq("id", p.id)
          .select("id")
          .single(),
      p.publish_on_site
        ? "Imóvel ocultado do site."
        : "Imóvel publicado no site.",
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="Portfólio imobiliário"
        title="Imóveis"
        description="Da captação à publicação. Todo o seu portfólio sob controle."
        action={
          <NewButton onClick={() => setCreate(true)}>
            Cadastrar imóvel
          </NewButton>
        }
      />
      <div className="crm-toolbar">
        <select
          aria-label="Filtrar situação do imóvel"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todas as situações</option>
          {[
            "rascunho",
            "pendente",
            "aprovado",
            "publicado",
            "ativo",
            "reservado",
            "vendido",
            "alugado",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar portfólio"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="">Catálogo acessível</option>
          <option value="mine">Meu portfólio</option>
        </select>
        <span className="crm-detail-pill">{properties.length} imóveis</span>
        <div className="crm-view-toggle">
          <button
            className={view === "cards" ? "active" : ""}
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            <LayoutGrid size={15} />
            Cards
          </button>
          <button
            className={view === "table" ? "active" : ""}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            <List size={15} />
            Tabela
          </button>
        </div>
      </div>
      <SectionState tables={["properties"]}>
        {properties.length ? (
          view === "cards" ? (
            <div className="crm-property-grid">
              {properties.map((p) => (
                <article key={p.id} className="crm-property-card">
                  <div className="crm-property-image">
                    <PrivateThumbnail
                      url={p.images?.[0] || p.main_image_url || undefined}
                      title={p.title}
                    />
                    <Badge>{p.property_code || `#${p.id}`}</Badge>
                  </div>
                  <div className="crm-property-card-body">
                    <h3>{p.title}</h3>
                    <p>
                      <MapPin
                        size={11}
                        style={{ display: "inline", marginRight: 5 }}
                      />
                      {p.location}
                    </p>
                    <strong>{p.price}</strong>
                    <div className="crm-property-specs">
                      <span>
                        <BedDouble size={12} style={{ display: "inline" }} />{" "}
                        {p.bedrooms || 0}
                      </span>
                      <span>
                        <Maximize size={12} style={{ display: "inline" }} />{" "}
                        {p.area || "—"} m²
                      </span>
                      <span>
                        <Car size={12} style={{ display: "inline" }} />{" "}
                        {p.garage || 0}
                      </span>
                    </div>
                    <div className="crm-card-footer">
                      <Badge
                        tone={
                          p.publish_on_site &&
                          ["aprovado", "publicado"].includes(p.workflow_status)
                            ? "green"
                            : "amber"
                        }
                      >
                        {p.publish_on_site &&
                        ["aprovado", "publicado"].includes(p.workflow_status)
                          ? "No site"
                          : p.workflow_status}
                      </Badge>
                      <button
                        className="crm-link-button"
                        onClick={() => setSelected(p)}
                      >
                        Detalhes <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="crm-panel crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Imóvel</th>
                    <th>Código</th>
                    <th>Valor</th>
                    <th>Disponibilidade</th>
                    <th>Publicação</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <button
                          className="crm-link-button"
                          onClick={() => setSelected(p)}
                        >
                          <strong>{p.title}</strong>
                        </button>
                        <small>{p.location}</small>
                      </td>
                      <td>{p.property_code}</td>
                      <td>{p.price}</td>
                      <td>
                        <Badge>{p.status}</Badge>
                      </td>
                      <td>
                        <Badge tone={p.publish_on_site ? "green" : "muted"}>
                          {p.workflow_status}
                        </Badge>
                      </td>
                      <td>
                        {ctx.data.brokers.find((b) => b.id === p.broker_id)
                          ?.name || "Não atribuído"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="crm-panel">
            <Empty
              title="Seu portfólio começa aqui"
              description="Cadastre seu primeiro imóvel ou ajuste os filtros para encontrar um existente."
              action={
                <NewButton onClick={() => setCreate(true)}>
                  Cadastrar imóvel
                </NewButton>
              }
            />
          </div>
        )}
      </SectionState>
      {shareProperty && (
        <ShareComposer
          propertyId={shareProperty}
          onClose={() => setShareProperty(null)}
        />
      )}
      {(create || edit) && (
        <Modal
          title={edit ? "Editar imóvel" : "Captar um novo imóvel"}
          description="Cadastro completo, mídia, localização e características."
          wide
          onClose={() => {
            setCreate(false);
            setEdit(null);
          }}
        >
          <div className="crm-dark-form">
            <PropertyForm
              key={edit?.id || "new"}
              initialData={edit || { broker_id: ctx.userId }}
              onSaved={saved}
            />
          </div>
        </Modal>
      )}
      {selected &&
        (() => {
          const p =
            ctx.data.properties.find((p) => p.id === selected.id);
          if (!p) return null;
          const linkEnabled =
            eligibleProperty(p, ctx.userId);
          const links = ctx.data.crm_contact_links.filter(
            (l) => l.property_id === p.id,
          );
          return (
            <Modal
              title={p.title}
              description={`${p.property_code} · ${p.category}`}
              onClose={() => setSelected(null)}
              wide
            >
              {ctx.notice && !ctx.notice.error && (
                <div className="crm-alert" role="status">
                  {ctx.notice.text}
                </div>
              )}
              <div className="crm-detail-grid">
                <div>
                  <small>Disponibilidade</small>
                  <strong>{p.status}</strong>
                </div>
                <div>
                  <small>Publicação</small>
                  <strong>
                    {p.publish_on_site
                      ? "Publicação habilitada"
                      : "Oculto do site"}{" "}
                    · {p.workflow_status}
                  </strong>
                </div>
                <div>
                  <small>Preço</small>
                  <strong>{p.price}</strong>
                </div>
                <div>
                  <small>Responsável</small>
                  <strong>
                    {ctx.data.brokers.find((b) => b.id === p.broker_id)?.name ||
                      "Não informado"}
                  </strong>
                </div>
              </div>
              <div className="crm-detail-actions">
                {linkEnabled && (
                  <Button
                    onClick={() => {
                      setShareProperty(p.id);
                      setSelected(null);
                    }}
                  >
                    Compartilhar apresentação
                  </Button>
                )}
                {canEdit(p) && (
                  <Button
                    onClick={() => {
                      setSelected(null);
                      setEdit(p);
                    }}
                  >
                    Editar cadastro
                  </Button>
                )}
                {ctx.operations &&
                  !["aprovado", "publicado"].includes(p.workflow_status) && (
                    <Button disabled={ctx.busy} onClick={() => void approve(p)}>
                      <Check size={15} />
                      Aprovar imóvel
                    </Button>
                  )}
                {canEdit(p) &&
                  ["aprovado", "publicado"].includes(p.workflow_status) && (
                    <Button
                      secondary
                      disabled={ctx.busy}
                      onClick={() => void publish(p)}
                    >
                      <EyeOff size={15} />
                      {p.publish_on_site
                        ? "Ocultar do site"
                        : "Publicar no site"}
                    </Button>
                  )}
                {canEdit(p) && ["rascunho"].includes(p.workflow_status) && (
                  <Button
                    secondary
                    disabled={ctx.busy}
                    onClick={() =>
                      void ctx.run(() =>
                        supabase
                          .from("properties")
                          .update({ workflow_status: "pendente" })
                          .eq("id", p.id)
                          .select("id")
                          .single(),
                        "Imóvel enviado para aprovação. A gestão foi notificada.",
                      )
                    }
                  >
                    <Send size={15} />
                    Enviar para aprovação
                  </Button>
                )}
                {ctx.operations && (
                  <Button
                    secondary
                    onClick={() => {
                      setSelected(null);
                      setArchive(p);
                    }}
                  >
                    <Archive size={15} />
                    Arquivar
                  </Button>
                )}
              </div>
              {canEdit(p) && (
                <PropertySettings
                  key={`${p.id}:${p.status}:${p.presentation_enabled}`}
                  property={p}
                />
              )}
              <h3>Apresentação compartilhável</h3>
              <p
                style={{ fontSize: 12, color: "#8098a7", margin: "8px 0 15px" }}
              >
                O link mostra os dados de apresentação e as fotos do imóvel.
                Aprovação e publicação no site são independentes.
              </p>
              <p>
                {linkEnabled
                  ? "Use Compartilhar apresentação para criar um link individual com validade e revogação, sem publicar o imóvel no site."
                  : "Habilite a apresentação de um imóvel do qual você seja proprietário ou responsável."}
              </p>
              <p className="crm-detail-pill" style={{ margin: "20px 0" }}>
                {p.description}
              </p>
              <h3>Relacionamentos</h3>
              {links.map((l) => (
                <div key={l.id} className="crm-list-row">
                  <div>
                    <strong>
                      {ctx.data.clients.find((c) => c.id === l.contact_id)
                        ?.name || "Contato"}
                    </strong>
                    <small>{l.relation}</small>
                  </div>
                </div>
              ))}
              {canEdit(p) && <PropertyContactForm property={p} />}
              <p style={{ fontSize: 11, color: "#99aab4", marginTop: 20 }}>
                Cadastro: {dateTime(p.created_at)}
              </p>
            </Modal>
          );
        })()}
      {archive && (
        <Modal
          title="Arquivar imóvel"
          description="O imóvel ficará oculto. O cadastro e o histórico serão preservados."
          onClose={() => setArchive(null)}
        >
          <p>{archive.title}</p>
          <div className="crm-form-actions">
            <Button secondary onClick={() => setArchive(null)}>
              Cancelar
            </Button>
            <Button
              disabled={ctx.busy}
              onClick={async () => {
                if (
                  await ctx.run(
                    () =>
                      supabase
                        .from("properties")
                        .update({
                          deleted_at: new Date().toISOString(),
                          publish_on_site: false,
                        })
                        .eq("id", archive.id)
                        .select("id")
                        .single(),
                    "Imóvel arquivado.",
                  )
                )
                  setArchive(null);
              }}
            >
              Confirmar arquivamento
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function PropertyContactForm({ property }: { property: CrmProperty }) {
  const ctx = useWorkspace();
  const [open, setOpen] = useState(false);
  const fields: Field[] = [
    {
      name: "contact_id",
      label: "Contato",
      required: true,
      options: ctx.data.clients.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "relation",
      label: "Relacionamento",
      required: true,
      options: [
        { value: "proprietario", label: "Proprietário" },
        { value: "interesse", label: "Cliente interessado" },
      ],
    },
  ];
  return open ? (
    <EntityForm
      fields={fields}
      onClose={() => setOpen(false)}
      onSubmit={(f) =>
        ctx.run(() =>
          supabase
            .from("crm_contact_links")
            .insert({
              contact_id: numberId(f, "contact_id"),
              property_id: property.id,
              relation: text(f, "relation"),
            })
            .select("id")
            .single(),
        )
      }
    />
  ) : (
    <Button secondary onClick={() => setOpen(true)}>
      Vincular proprietário ou cliente
    </Button>
  );
}

export function PropertySettings({ property }: { property: CrmProperty }) {
  const ctx = useWorkspace();
  const [status, setStatus] = useState(property.status);
  const [presentationEnabled, setPresentationEnabled] = useState(property.presentation_enabled);
  const changed = status !== property.status || presentationEnabled !== property.presentation_enabled;
  return (
    <form className="crm-form" onSubmit={async (event) => {
      event.preventDefault();
      if (!changed || ctx.busy) return;
      const patch = { status, presentation_enabled: presentationEnabled };
      await ctx.run(async () => {
        const { data, error } = await supabase.from("properties")
          .update(patch).eq("id", property.id)
          .select("id,status,presentation_enabled").single();
        if (error) return { error };
        if (!data || data.status !== patch.status || data.presentation_enabled !== patch.presentation_enabled) {
          return { error: { message: "O banco não confirmou as opções escolhidas. Atualize a página e tente novamente." } };
        }
        return { error: null };
      }, "Disponibilidade e apresentação salvas.");
    }}>
      <fieldset disabled={ctx.busy}>
        <div className="crm-form-grid">
          <label>Disponibilidade
            <select aria-label="Disponibilidade comercial" value={status}
              onChange={(event) => setStatus(event.currentTarget.value)}>
              {["ativo", "reservado", "vendido", "alugado", "rascunho", "inativo"].map(value => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>Apresentação
            <select aria-label="Habilitar página de apresentação" value={String(presentationEnabled)}
              onChange={(event) => setPresentationEnabled(event.currentTarget.value === "true")}>
              <option value="true">Habilitada</option>
              <option value="false">Desabilitada</option>
            </select>
          </label>
        </div>
        <p role="status">{ctx.busy ? "Salvando opções…" : changed ? "Alterações ainda não salvas." : "As opções exibidas estão salvas."}</p>
        <p>Gerar uma apresentação não aprova nem publica o imóvel no site.</p>
        <div className="crm-form-actions">
          <Button type="submit" disabled={ctx.busy || !changed}>
            {ctx.busy ? "Salvando…" : "Salvar disponibilidade e apresentação"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
