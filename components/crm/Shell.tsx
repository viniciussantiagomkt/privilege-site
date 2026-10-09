"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  Handshake,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Target,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { initials, matches, dateTime } from "@/lib/crm/model";
import { useWorkspace } from "./Workspace";
import { Modal, Empty, Badge, Button } from "./UI";
export const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads e pipeline", icon: Target },
  { href: "/admin/imoveis", label: "Imóveis", icon: Building2 },
  { href: "/admin/contatos", label: "Clientes e proprietários", icon: Users },
  { href: "/admin/agenda", label: "Agenda e tarefas", icon: CalendarDays },
  { href: "/admin/negocios", label: "Propostas e vendas", icon: Handshake },
  { href: "/admin/equipe", label: "Equipe e desempenho", icon: BarChart3 },
];
export function CrmShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const ctx = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const active = NAV.find((n) => n.href === path) || NAV[0];
  const me = ctx.data.brokers.find((b) => b.id === ctx.userId);
  const unread = ctx.data.notifications.filter((n) => !n.read);
  const results = ctx.query
    ? [
        ...ctx.data.leads
          .filter((l) => matches(ctx.query, l.name, l.phone, l.email))
          .slice(0, 4)
          .map((l) => ({
            id: `lead${l.id}`,
            name: l.name,
            type: "Lead",
            href: `/admin/leads?lead=${l.id}`,
          })),
        ...ctx.data.properties
          .filter((p) =>
            matches(ctx.query, p.title, p.property_code, p.location),
          )
          .slice(0, 4)
          .map((p) => ({
            id: `p${p.id}`,
            name: p.title,
            type: p.property_code,
            href: "/admin/imoveis",
          })),
        ...ctx.data.clients
          .filter((c) => matches(ctx.query, c.name, c.phone))
          .slice(0, 3)
          .map((c) => ({
            id: `c${c.id}`,
            name: c.name,
            type: "Contato",
            href: "/admin/contatos",
          })),
      ]
    : [];
  return (
    <div className={`crm-app ${collapsed ? "crm-collapsed" : ""}`}>
      <button
        aria-label="Fechar menu"
        hidden={!mobile}
        className="crm-sidebar-overlay"
        onClick={() => setMobile(false)}
      />
      <aside className={`crm-sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link
          href="/admin"
          className="crm-brand"
          onClick={() => setMobile(false)}
        >
          <Image
            src="/brand/symbol-blue.png"
            alt="Privilege"
            width={40}
            height={40}
          />
          <div>
            <strong>PRIVILEGE</strong>
            <span>WORKSPACE IMOBILIÁRIO</span>
          </div>
        </Link>
        <div className="crm-sidebar-caption">SEU ESPAÇO DE TRABALHO</div>
        <nav aria-label="Navegação CRM">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.label}
              aria-current={n.href === path ? "page" : undefined}
              className={n.href === path ? "active" : ""}
              onClick={() => {
                setMobile(false);
                ctx.setQuery("");
              }}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
              {n.href === path && <i />}
            </Link>
          ))}
        </nav>
        <div className="crm-sidebar-bottom">
          <div className="crm-sidebar-note">
            <span className="crm-live-dot" />
            <div>
              <strong>Ambiente de homologação</strong>
              <p>Dados do staging</p>
            </div>
          </div>
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            <span>Ver site público</span>
          </a>
          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>Recolher menu</span>
          </button>
          <button
            onClick={() =>
              void ctx.run(() => supabase.auth.signOut(), "Sessão encerrada.")
            }
          >
            <LogOut size={18} />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>
      <div className="crm-workspace">
        <header className="crm-header">
          <button
            className="crm-icon-button crm-mobile-toggle"
            aria-label="Abrir navegação"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <div className="crm-breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{active.label}</strong>
          </div>
          <div className="crm-search-wrap">
            <label className="crm-global-search">
              <Search size={18} />
              <input
                aria-label="Buscar leads, imóveis e contatos"
                placeholder="Buscar no workspace..."
                value={ctx.query}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  ctx.setQuery(e.target.value);
                  setSearchOpen(true);
                }}
              />
              {ctx.query && (
                <button
                  aria-label="Limpar busca"
                  onClick={() => ctx.setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            {searchOpen && ctx.query && (
              <div className="crm-search-results">
                <div className="crm-panel-head">
                  <strong>Resultados</strong>
                  <button
                    className="crm-icon-button"
                    onClick={() => setSearchOpen(false)}
                    aria-label="Fechar resultados"
                  >
                    <X size={16} />
                  </button>
                </div>
                {results.length ? (
                  results.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      onClick={() => setSearchOpen(false)}
                    >
                      <span>{r.name}</span>
                      <small>{r.type}</small>
                    </Link>
                  ))
                ) : (
                  <p>Nenhum resultado encontrado.</p>
                )}
              </div>
            )}
          </div>
          <div className="crm-header-actions">
            <button
              className="crm-icon-button"
              aria-label="Atualizar dados"
              disabled={ctx.refreshing}
              onClick={() => void ctx.reload()}
            >
              <RefreshCw
                size={18}
                className={ctx.refreshing ? "crm-spin" : ""}
              />
            </button>
            <button
              className="crm-icon-button crm-notification-button"
              aria-label={`Notificações: ${unread.length} não lidas`}
              onClick={() => setNotifications(true)}
            >
              <Bell size={20} />
              {unread.length > 0 && <i>{unread.length}</i>}
            </button>
            <span className="crm-user-avatar">
              {initials(me?.name || ctx.email || "P")}
            </span>
            <div className="crm-user-info">
              <strong>
                {me?.name || ctx.email.split("@")[0] || "Sua conta"}
              </strong>
              <small>{ctx.operations ? "Gestão" : "Corretor"}</small>
            </div>
          </div>
        </header>
        <main className="crm-main">
          {ctx.notice && (
            <div
              className={`crm-toast ${ctx.notice.error ? "error" : ""}`}
              role={ctx.notice.error ? "alert" : "status"}
              aria-live="polite"
            >
              <span>{ctx.notice.text}</span>
              <button
                aria-label="Fechar mensagem"
                onClick={() => ctx.setNotice(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {ctx.errors.session && (
            <div role="alert" className="crm-alert">
              {ctx.errors.session}
            </div>
          )}
          {children}
          <footer className="crm-footer">
            <span>
              Privilege Imóveis <b>•</b> Onde o privilégio tem endereço.
            </span>
            <span>
              {ctx.updatedAt
                ? `Atualizado às ${ctx.updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Conectando ao workspace"}
            </span>
          </footer>
        </main>
      </div>
      {notifications && (
        <Modal
          title="Sua central de notificações"
          description={`${unread.length} não lidas`}
          onClose={() => setNotifications(false)}
        >
          {ctx.data.notifications.length ? (
            ctx.data.notifications
              .slice()
              .reverse()
              .map((n) => (
                <div key={n.id} className="crm-notification-row">
                  <div>
                    <strong>{n.title}</strong>
                    <p>{n.description}</p>
                    <small>{dateTime(n.created_at)}</small>
                  </div>
                  {n.read ? (
                    <Badge tone="muted">Lida</Badge>
                  ) : (
                    <Button
                      secondary
                      disabled={ctx.busy}
                      onClick={() =>
                        void ctx.run(() =>
                          supabase.rpc("crm_read_notification", {
                            target_notification: n.id,
                          }),
                        )
                      }
                    >
                      <CheckCheck size={16} />
                      Ler
                    </Button>
                  )}
                </div>
              ))
          ) : (
            <Empty
              title="Tudo em dia"
              description="Suas notificações aparecerão aqui."
            />
          )}
        </Modal>
      )}
    </div>
  );
}
