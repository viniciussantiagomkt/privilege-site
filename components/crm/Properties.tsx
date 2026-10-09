"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Building2,
  LayoutGrid,
  List,
  MapPin,
  BedDouble,
  Maximize,
  Car,
  ExternalLink,
  Copy,
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
  const [view, setView] = useState("cards");
  const [filter, setFilter] = useState("");
  const [scope, setScope] = useState("");
  const [edit, setEdit] = useState<CrmProperty | null>(null);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<CrmProperty | null>(null);
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
    ctx.setNotice({ text: "Cadastro do imóvel salvo.", error: false });
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
            ctx.data.properties.find((p) => p.id === selected.id) || selected;
          const linkEnabled =
            p.presentation_enabled &&
            p.publish_on_site &&
            ["aprovado", "publicado"].includes(p.workflow_status);
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
                <div className="crm-toolbar">
                  <label>
                    Disponibilidade{" "}
                    <select
                      aria-label="Disponibilidade comercial"
                      className="crm-compact-status"
                      value={p.status}
                      disabled={ctx.busy}
                      onChange={(e) =>
                        void ctx.run(() =>
                          supabase
                            .from("properties")
                            .update({ status: e.target.value })
                            .eq("id", p.id)
                            .select("id")
                            .single(),
                        )
                      }
                    >
                      {[
                        "ativo",
                        "reservado",
                        "vendido",
                        "alugado",
                        "rascunho",
                        "inativo",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Apresentação{" "}
                    <select
                      aria-label="Habilitar página de apresentação"
                      className="crm-compact-status"
                      value={String(p.presentation_enabled)}
                      disabled={ctx.busy}
                      onChange={(e) =>
                        void ctx.run(() =>
                          supabase
                            .from("properties")
                            .update({
                              presentation_enabled: e.target.value === "true",
                            })
                            .eq("id", p.id)
                            .select("id")
                            .single(),
                        )
                      }
                    >
                      <option value="true">Habilitada</option>
                      <option value="false">Desabilitada</option>
                    </select>
                  </label>
                </div>
              )}
              <h3>Apresentação compartilhável</h3>
              <p
                style={{ fontSize: 12, color: "#8098a7", margin: "8px 0 15px" }}
              >
                A página contém os campos públicos do imóvel e acompanha sua
                visibilidade no site.
              </p>
              {linkEnabled ? (
                <div className="crm-detail-actions">
                  <a
                    className="crm-button secondary"
                    target="_blank"
                    rel="noreferrer"
                    href={`/apresentacao/${p.slug}`}
                  >
                    <ExternalLink size={15} />
                    Abrir apresentação
                  </a>
                  <Button
                    secondary
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(
                          `${window.location.origin}/apresentacao/${p.slug}`,
                        )
                        .then(() =>
                          ctx.setNotice({
                            text: "Link copiado.",
                            error: false,
                          }),
                        )
                        .catch(() =>
                          ctx.setNotice({
                            text: "Não foi possível copiar. Abra a apresentação e copie o endereço.",
                            error: true,
                          }),
                        );
                    }}
                  >
                    <Copy size={15} />
                    Copiar link
                  </Button>
                </div>
              ) : (
                <Badge tone="amber">
                  A apresentação exige aprovação e publicação
                </Badge>
              )}
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
