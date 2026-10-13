"use client";
import { useState } from "react";
import { Users, Phone, Mail, Building2 } from "lucide-react";
import { useWorkspace } from "./Workspace";
import { supabase } from "@/lib/supabase";
import {
  PageHeading,
  SectionState,
  NewButton,
  Empty,
  Badge,
  Modal,
  EntityForm,
  Button,
  text,
  optional,
  type Field,
} from "./UI";
import { matches, initials, type Contact } from "@/lib/crm/model";
export function Contacts() {
  const ctx = useWorkspace();
  const [kind, setKind] = useState("");
  const [edit, setEdit] = useState<Contact | null>(null);
  const [create, setCreate] = useState(false);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [archive, setArchive] = useState<Contact | null>(null);
  const contacts = ctx.data.clients.filter(
    (c) =>
      matches(ctx.query, c.name, c.phone, c.email) &&
      (!kind || c.contact_type === kind || c.contact_type === "ambos"),
  );
  const fields: Field[] = [
    { name: "name", label: "Nome completo", required: true, value: edit?.name },
    {
      name: "contact_type",
      label: "Tipo de contato",
      required: true,
      value: edit?.contact_type || "cliente",
      options: [
        { value: "cliente", label: "Cliente" },
        { value: "proprietario", label: "Proprietário" },
        { value: "ambos", label: "Cliente e proprietário" },
      ],
    },
    {
      name: "phone",
      label: "Telefone / WhatsApp",
      type: "tel",
      value: edit?.phone,
    },
    { name: "email", label: "E-mail", type: "email", value: edit?.email },
    {
      name: "notes",
      label: "Preferências e observações",
      type: "textarea",
      value: edit?.notes,
    },
  ];
  const submit = (f: FormData) => {
    const payload = {
      name: text(f, "name"),
      phone: optional(f, "phone"),
      email: optional(f, "email"),
      notes: optional(f, "notes"),
      contact_type: text(f, "contact_type"),
    };
    return ctx.run(
      () =>
        edit
          ? supabase
              .from("clients")
              .update(payload)
              .eq("id", edit.id)
              .select("id")
              .single()
          : supabase
              .from("clients")
              .insert({ ...payload, broker_id: ctx.userId })
              .select("id")
              .single(),
      "Contato salvo.",
    );
  };
  return (
    <>
      <PageHeading
        eyebrow="Sua rede de relacionamentos"
        title="Clientes e proprietários"
        description="Conheça cada pessoa por trás de uma oportunidade."
        action={
          <NewButton onClick={() => setCreate(true)}>Novo contato</NewButton>
        }
      />
      <div className="crm-toolbar">
        <select
          aria-label="Filtrar tipo de contato"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Todos os contatos</option>
          <option value="cliente">Clientes</option>
          <option value="proprietario">Proprietários</option>
        </select>
        <span className="crm-detail-pill">
          <Users size={14} />
          {contacts.length} contatos
        </span>
      </div>
      <SectionState tables={["clients", "crm_contact_links"]}>
        <div className="crm-panel crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Perfil</th>
                <th>Contato</th>
                <th>Relacionamentos</th>
                <th>Corretor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="crm-contact-row">
                      <span className="crm-user-avatar">
                        {initials(c.name)}
                      </span>
                      <button
                        className="crm-link-button"
                        onClick={() => setDetail(c)}
                      >
                        <strong>{c.name}</strong>
                      </button>
                    </div>
                  </td>
                  <td>
                    <Badge>
                      {c.contact_type === "ambos"
                        ? "Cliente / proprietário"
                        : c.contact_type}
                    </Badge>
                  </td>
                  <td>
                    {c.phone || "Não informado"}
                    <small>{c.email}</small>
                  </td>
                  <td>
                    {
                      ctx.data.crm_contact_links.filter(
                        (l) => l.contact_id === c.id,
                      ).length
                    }{" "}
                    vínculos
                  </td>
                  <td>
                    {ctx.data.brokers.find((b) => b.id === c.broker_id)?.name ||
                      "Não informado"}
                  </td>
                  <td>
                    <button
                      className="crm-link-button"
                      onClick={() => setEdit(c)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contacts.length && (
            <Empty
              title="Construa sua rede"
              description="Cadastre clientes e proprietários para relacionar atendimentos e imóveis."
              action={
                <NewButton onClick={() => setCreate(true)}>
                  Cadastrar contato
                </NewButton>
              }
            />
          )}
        </div>
      </SectionState>
      {(create || edit) && (
        <Modal
          title={edit ? "Editar contato" : "Novo contato"}
          description="Informações acessíveis apenas aos perfis autorizados."
          onClose={() => {
            setCreate(false);
            setEdit(null);
          }}
        >
          <EntityForm
            fields={fields}
            onClose={() => {
              setCreate(false);
              setEdit(null);
            }}
            onSubmit={submit}
          />
        </Modal>
      )}
      {detail && (
        <Modal
          title={detail.name}
          description={detail.contact_type}
          onClose={() => setDetail(null)}
        >
          <div className="crm-detail-actions">
            {detail.phone && (
              <a
                className="crm-button secondary"
                href={`tel:${detail.phone.replace(/\D/g, "")}`}
              >
                <Phone size={15} />
                {detail.phone}
              </a>
            )}
            {detail.email && (
              <a
                className="crm-button secondary"
                href={`mailto:${detail.email}`}
              >
                <Mail size={15} />
                E-mail
              </a>
            )}
            <Button
              onClick={() => {
                setEdit(detail);
                setDetail(null);
              }}
            >
              Editar contato
            </Button>
            <Button
              secondary
              onClick={() => {
                setArchive(detail);
                setDetail(null);
              }}
            >
              Arquivar contato
            </Button>
          </div>
          {detail.notes && <p className="crm-detail-pill">{detail.notes}</p>}
          <h3 style={{ marginTop: 20 }}>Imóveis e atendimentos relacionados</h3>
          {ctx.data.crm_contact_links.filter((l) => l.contact_id === detail.id)
            .length ? (
            ctx.data.crm_contact_links
              .filter((l) => l.contact_id === detail.id)
              .map((l) => (
                <div className="crm-list-row" key={l.id}>
                  <Building2 size={17} />
                  <div>
                    <strong>
                      {l.property_id
                        ? ctx.data.properties.find(
                            (p) => p.id === l.property_id,
                          )?.title
                        : ctx.data.leads.find((lead) => lead.id === l.lead_id)
                            ?.name}
                    </strong>
                    <small>{l.relation}</small>
                  </div>
                </div>
              ))
          ) : (
            <Empty
              title="Nenhum relacionamento vinculado"
              description="Vincule este contato nos detalhes de um imóvel ou lead."
            />
          )}
        </Modal>
      )}
      {archive && (
        <Modal
          title="Arquivar contato"
          description="O histórico e os vínculos existentes serão preservados."
          onClose={() => setArchive(null)}
        >
          <p>{archive.name}</p>
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
                        .from("clients")
                        .update({ deleted_at: new Date().toISOString() })
                        .eq("id", archive.id)
                        .select("id")
                        .single(),
                    "Contato arquivado.",
                  )
                )
                  setArchive(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
