"use client";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/lib/crm/model";
import {
  PURPOSES,
  draftFields,
  interestFromForm,
  normalizeClientPhone,
  possibleClientDuplicates,
} from "@/lib/crm/quick-service";
import { useWorkspace } from "./Workspace";
import { Button, type Field, text } from "./UI";

// Both the specialized contacts screen and the hub use the same base fields.
export function clientFields(contact?: Contact | null): Field[] {
  return [
    {
      name: "name",
      label: "Nome completo",
      required: true,
      value: contact?.name,
      maxLength: 160,
    },
    {
      name: "contact_type",
      label: "Tipo de contato",
      required: true,
      value: contact?.contact_type || "cliente",
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
      value: contact?.phone,
      maxLength: 64,
    },
    {
      name: "email",
      label: "E-mail",
      type: "email",
      value: contact?.email,
      maxLength: 254,
    },
    {
      name: "notes",
      label: "Preferências e observações",
      type: "textarea",
      value: contact?.notes,
    },
  ];
}
export function quickServiceError(error: { code?: string } | null) {
  if (!error) return null;
  const messages: Record<string, string> = {
    "23505":
      "Já existe um contato com esse WhatsApp ou e-mail na sua carteira. Localize-o na busca.",
    "40001":
      "O cadastro mudou em outra sessão. Reabra o cliente antes de editar.",
    "42501": "Cliente indisponível para esta sessão. Reabra seu atendimento.",
    PGRST202:
      "Cadastro rápido ainda não habilitado neste ambiente. Aguarde a migration autorizada.",
    "42883":
      "Cadastro rápido ainda não habilitado neste ambiente. Aguarde a migration autorizada.",
    "22023": "Revise os campos do cadastro e tente novamente.",
  };
  return {
    message:
      messages[error.code || ""] ||
      "Não foi possível concluir. Seus campos foram preservados; tente novamente.",
  };
}

export function ClientEditor({
  contact,
  onSaved,
  onCancel,
  onDirty,
  onExisting,
  allowContactTypeOnCreate = false,
}: {
  contact?: Contact;
  onSaved: (id: number) => void;
  onCancel: () => void;
  onDirty: () => void;
  onExisting: (id: number) => void;
  allowContactTypeOnCreate?: boolean;
}) {
  const ctx = useWorkspace();
  const form = useRef<HTMLFormElement>(null);
  // Polling may refresh the row while uncontrolled inputs still contain an older draft.
  const revision = useRef(contact?.interest_revision ?? null);
  const receipt = useRef<{ fingerprint: string; id: string } | null>(null);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<Contact[]>([]);
  const [draft, setDraft] = useState("");
  const [review, setReview] = useState<ReturnType<typeof draftFields> | null>(
    null,
  );
  const profile = contact?.interest_profile || {};
  async function save(f: FormData) {
    if (submitting.current || ctx.busy) return;
    setError("");
    setDuplicates([]);
    try {
      const phone = normalizeClientPhone(text(f, "phone"));
      const name = text(f, "name");
      if (name.length < 2)
        throw Error("Informe o nome com pelo menos dois caracteres.");
      const interest = interestFromForm(f);
      if (!contact && !interest.purpose)
        throw Error("Selecione o tipo de interesse.");
      if (ctx.errors.clients)
        throw Error(
          "A carteira não foi carregada. Reabra Atendimentos antes de cadastrar.",
        );
      const possible = possibleClientDuplicates(ctx.data.clients, {
        id: contact?.id,
        phone,
        email: text(f, "email"),
      });
      if (possible.length) {
        setDuplicates(possible);
        return;
      }
      const payload = {
        name,
        phone,
        email: text(f, "email") || null,
        notes: text(f, "notes") || null,
        contact_type: text(f, "contact_type") || "cliente",
        interest_profile: interest,
      };
      const fingerprint = JSON.stringify([
        contact?.id,
        revision.current,
        payload,
      ]);
      if (receipt.current?.fingerprint !== fingerprint)
        receipt.current = { fingerprint, id: crypto.randomUUID() };
      submitting.current = true;
      let savedId = 0;
      const ok = await ctx.run(async () => {
        const result = await supabase.rpc("crm_save_quick_client", {
          target_client: contact?.id ?? null,
          expected_revision: revision.current,
          action_id: receipt.current!.id,
          payload,
        });
        if (!result.error) savedId = Number(result.data?.id);
        return {
          error:
            quickServiceError(result.error) ||
            (!savedId
              ? {
                  message:
                    "O servidor não confirmou o cadastro. Tente novamente.",
                }
              : null),
        };
      }, "Cliente salvo. Nenhum lead foi criado automaticamente.");
      if (ok && savedId) onSaved(savedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revise os campos.");
    } finally {
      submitting.current = false;
    }
  }
  return (
    <>
      {!contact && (
        <details className="crm-service-section">
          <summary>Preparar um rascunho</summary>
          <p>
            Reconhecimento de voz não habilitado. Digite o rascunho abaixo,
            revise e aplique os campos. Nenhum microfone ou áudio será
            utilizado.
          </p>
          <label>
            Rascunho digitado
            <textarea
              value={draft}
              maxLength={2000}
              placeholder={"Nome: Cliente fictício\nWhatsApp: (83) 90000-0000"}
              onChange={(e) => {
                setDraft(e.target.value);
                setReview(null);
                onDirty();
              }}
            />
          </label>
          <Button secondary onClick={() => setReview(draftFields(draft))}>
            Revisar campos
          </Button>
          {review && (
            <div>
              <p>
                Nome: {review.name || "Não identificado"}
                <br />
                WhatsApp: {review.phone || "Não identificado"}
              </p>
              <Button
                secondary
                onClick={() => {
                  const name = form.current?.elements.namedItem("name"),
                    phone = form.current?.elements.namedItem("phone");
                  if (name instanceof HTMLInputElement && review.name)
                    name.value = review.name;
                  if (phone instanceof HTMLInputElement && review.phone)
                    phone.value = review.phone;
                  setReview(null);
                  onDirty();
                }}
              >
                Aplicar ao cadastro sem salvar
              </Button>
            </div>
          )}
        </details>
      )}
      <form
        ref={form}
        className="crm-form"
        onChange={onDirty}
        onSubmit={(e) => {
          e.preventDefault();
          void save(new FormData(e.currentTarget));
        }}
      >
        <fieldset disabled={ctx.busy}>
          <div className="crm-form-grid">
            {clientFields(contact)
              .filter(
                (f) => contact || ["name", "phone", "notes"].includes(f.name) || (allowContactTypeOnCreate && f.name === "contact_type"),
              )
              .map((f) => (
                <label
                  key={f.name}
                  className={f.type === "textarea" ? "full" : ""}
                >
                  {f.label}
                  {f.required || f.name === "phone" ? " *" : ""}
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.name}
                      aria-label={f.label}
                      defaultValue={f.value ?? ""}
                      maxLength={2000}
                    />
                  ) : f.options ? (
                    <select
                      name={f.name}
                      aria-label={f.label}
                      defaultValue={f.value ?? ""}
                    >
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={f.name}
                      aria-label={f.label}
                      type={f.type || "text"}
                      required={f.required || f.name === "phone"}
                      maxLength={f.maxLength}
                      defaultValue={f.value ?? ""}
                      autoComplete={
                        f.name === "phone"
                          ? "tel"
                          : f.name === "name"
                            ? "name"
                            : f.name === "email"
                              ? "email"
                              : "off"
                      }
                    />
                  )}
                </label>
              ))}
            <label>
              Finalidade do cadastro{!contact ? " *" : ""}
              <select
                name="purpose"
                aria-label="Tipo de interesse"
                required={!contact}
                defaultValue={profile.purpose || ""}
              >
                <option value="">Selecione</option>
                {Object.entries(PURPOSES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <details className="crm-service-section">
            <summary>Completar perfil de interesse (opcional)</summary>
            <div className="crm-form-grid">
              <label>
                Tipo de imóvel
                <select
                  name="property_type"
                  aria-label="Tipo de imóvel"
                  defaultValue={profile.property_type || ""}
                >
                  <option value="">Não informado</option>
                  {Object.entries({
                    apartamento: "Apartamento",
                    casa: "Casa",
                    condominio: "Condomínio",
                    terreno: "Terreno",
                    comercial: "Comercial",
                    outro: "Outro",
                  }).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cidade
                <input
                  name="city"
                  maxLength={100}
                  defaultValue={profile.city}
                />
              </label>
              <label className="full">
                Bairros desejados
                <input
                  name="neighborhoods"
                  maxLength={2019}
                  defaultValue={profile.neighborhoods?.join(", ")}
                  placeholder="Separe os bairros por vírgulas"
                />
              </label>
              {(
                [
                  ["budget_min", "Orçamento mínimo (R$)"],
                  ["budget_max", "Orçamento máximo (R$)"],
                  ["down_payment", "Entrada disponível (R$, voluntária)"],
                ] as const
              ).map(([name, label]) => (
                <label key={name}>
                  {label}
                  <input
                    type="number"
                    inputMode="decimal"
                    name={name}
                    min="0"
                    max="999999999999.99"
                    step="0.01"
                    defaultValue={profile[name]}
                  />
                </label>
              ))}
              {(
                [
                  ["bedrooms", "Quartos"],
                  ["parking_spaces", "Vagas de garagem"],
                ] as const
              ).map(([name, label]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    defaultValue={profile[name]}
                  />
                </label>
              ))}
              <label>
                Forma de pagamento
                <select
                  name="payment_method"
                  aria-label="Forma de pagamento"
                  defaultValue={profile.payment_method || ""}
                >
                  <option value="">Não informada</option>
                  {Object.entries({
                    a_vista: "À vista",
                    financiamento: "Financiamento",
                    consorcio: "Consórcio",
                    indefinido: "A definir",
                  }).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Interesse em financiamento
                <select
                  name="financing"
                  aria-label="Interesse em financiamento"
                  defaultValue={
                    profile.financing === undefined
                      ? ""
                      : String(profile.financing)
                  }
                >
                  <option value="">Não informado</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </label>
              <label className="full">
                Preferências adicionais
                <textarea
                  name="preferences"
                  maxLength={1000}
                  defaultValue={profile.preferences}
                />
              </label>
            </div>
            <p>
              Não inclua documentos, dados bancários ou informações financeiras
              além do necessário.
            </p>
          </details>
          {error && (
            <p className="crm-alert" role="alert">
              {error}
            </p>
          )}
          {duplicates.length > 0 && (
            <div className="crm-alert" role="alert">
              <p>
                Possível duplicidade na sua carteira. Abra o cadastro existente
                para continuar.
              </p>
              {duplicates.map((c) => (
                <Button key={c.id} secondary onClick={() => onExisting(c.id)}>
                  {c.name} · Abrir cadastro existente
                </Button>
              ))}
            </div>
          )}
          <div className="crm-form-actions">
            <Button secondary onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={ctx.busy}>
              {ctx.busy ? "Salvando…" : allowContactTypeOnCreate ? "Salvar contato" : "Salvar cliente"}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
