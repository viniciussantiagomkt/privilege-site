"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, Inbox, Plus, ArrowUpRight, LoaderCircle } from "lucide-react";
import { useWorkspace } from "./Workspace";
export function Empty({
  title = "Nenhum registro ainda",
  description = "Os novos registros aparecerão aqui.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="crm-empty">
      <span>
        <Inbox size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`crm-badge crm-badge-${tone}`}>{children}</span>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="crm-page-heading">
      <div>
        <p className="crm-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="crm-heading-actions">{action}</div>
    </div>
  );
}
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`crm-button ${secondary ? "secondary" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function NewButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus size={17} />
      {children}
    </Button>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`crm-panel ${className}`}>
      <div className="crm-panel-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}) {
  const { loading } = useWorkspace();
  return (
    <div className="crm-metric">
      <div className="crm-metric-top">
        <span>{label}</span>
        <span className="crm-metric-icon">{icon}</span>
      </div>
      <strong>{loading ? "—" : value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function SectionState({
  tables,
  children,
}: {
  tables: string[];
  children: ReactNode;
}) {
  const { loading, errors, reload } = useWorkspace();
  if (loading)
    return (
      <div
        className="crm-skeleton-grid"
        aria-label="Carregando dados"
        aria-busy="true"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="crm-skeleton" key={i} />
        ))}
      </div>
    );
  const error = tables.map((t) => errors[t]).filter(Boolean);
  return (
    <>
      {error.length > 0 && (
        <div className="crm-alert" role="alert">
          <strong>Alguns dados não puderam ser carregados.</strong>
          <p>{error.join(" · ")}</p>
          <Button secondary onClick={() => void reload()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`crm-dialog ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="crm-dialog-title"
    >
      <div className="crm-dialog-head">
        <div>
          <h2 id="crm-dialog-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          aria-label="Fechar janela"
          className="crm-icon-button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="crm-dialog-body">{children}</div>
    </dialog>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  value?: string | number | null;
  placeholder?: string;
};
export function EntityForm({
  fields,
  onSubmit,
  onClose,
  children,
}: {
  fields: Field[];
  onSubmit: (data: FormData) => Promise<boolean>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { busy } = useWorkspace();
  return (
    <form
      className="crm-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (await onSubmit(new FormData(form))) onClose();
      }}
    >
      <fieldset disabled={busy}>
        <div className="crm-form-grid">
          {fields.map((f) => (
            <label className={f.type === "textarea" ? "full" : ""} key={f.name}>
              {f.label}
              {f.required && <span aria-hidden="true"> *</span>}
              {f.options ? (
                <select
                  name={f.name}
                  required={f.required}
                  defaultValue={f.value ?? ""}
                >
                  <option value="">Selecione</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  rows={4}
                  maxLength={2000}
                  defaultValue={f.value ?? ""}
                />
              ) : (
                <input
                  name={f.name}
                  type={f.type || "text"}
                  required={f.required}
                  defaultValue={f.value ?? ""}
                  maxLength={f.type === "number" ? undefined : 160}
                  min={f.type === "number" ? "0.01" : undefined}
                  step={f.type === "number" ? "0.01" : undefined}
                  placeholder={f.placeholder}
                />
              )}
            </label>
          ))}
        </div>
        {children}
        <div className="crm-form-actions">
          <Button secondary onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle className="crm-spin" size={16} />
            ) : (
              <ArrowUpRight size={16} />
            )}
            Salvar
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
export const text = (f: FormData, k: string) => String(f.get(k) || "").trim();
export const optional = (f: FormData, k: string) => text(f, k) || null;
export const numberId = (f: FormData, k: string) =>
  text(f, k) ? Number(text(f, k)) : null;
