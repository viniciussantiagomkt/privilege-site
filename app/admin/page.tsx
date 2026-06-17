"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Eye,
  Heart,
  Home,
  Inbox,
  Lock,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { PropertyForm } from "@/components/PropertyForm";
import { EditModal } from "@/components/EditModal";
import { Property } from "@/types/property";

type AdminSection =
  | "dashboard"
  | "imoveis"
  | "leads"
  | "corretores"
  | "favoritos"
  | "analytics"
  | "configuracoes";

type UserRole = "admin" | "corretor";

interface Lead {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  property_title?: string;
  property_slug?: string;
  created_at?: string;
  property_id?: number;
}

interface PropertyMetric {
  id: number;
  title?: string;
  slug?: string;
  views_count?: number;
  favorites_count?: number;
  leads_count?: number;
}

interface LeadOriginMetric {
  source: string;
  total: number;
  novos: number;
  convertidos: number;
}

const menu = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "imoveis", label: "Imóveis", icon: Building2 },
  { id: "leads", label: "Leads", icon: Inbox },
  { id: "corretores", label: "Corretores", icon: Users, adminOnly: true },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { id: "configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
] satisfies {
  id: AdminSection;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
}[];

function getRoleLabel(role: UserRole) {
  return role === "admin" ? "Administrador" : "Corretor";
}

function getPropertyQuality(property: Property) {
  let score = 0;

  if (property.title?.length > 8) score += 15;
  if (property.description?.length > 120) score += 20;
  if (property.location) score += 15;
  if (property.price) score += 10;
  if ((property.images ?? []).filter(Boolean).length >= 5) score += 20;
  else if ((property.images ?? []).filter(Boolean).length > 0) score += 10;
  if (property.area) score += 10;
  if ((property.bedrooms ?? 0) > 0) score += 10;

  return Math.min(score, 100);
}

export default function AdminPage() {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("dashboard");
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedProperty, setSelectedProperty] =
    useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] =
    useState<Property | null>(null);
  const [propertyMetrics, setPropertyMetrics] = useState<PropertyMetric[]>([]);
  const [leadOrigins, setLeadOrigins] = useState<LeadOriginMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("corretor");
  const [userEmail, setUserEmail] = useState("");

  const activeCount = properties.filter((property) => property.status === "ativo").length;
  const reservedCount = properties.filter((property) => property.status === "reservado").length;
  const topQuality = useMemo(
    () =>
      [...properties]
        .sort((a, b) => getPropertyQuality(b) - getPropertyQuality(a))
        .slice(0, 4),
    [properties]
  );

  useEffect(() => {
    let active = true;

    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user.id;

      const [
        { data: propertyData },
        { data: leadData },
        { data: roleData },
        { data: metricData },
        { data: originData },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        userId
          ? supabase
              .from("user_roles")
              .select("role")
              .eq("id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("property_admin_metrics")
          .select("*")
          .order("views_count", { ascending: false })
          .limit(8),
        supabase
          .from("lead_origin_metrics")
          .select("*")
          .order("total", { ascending: false }),
      ]);

      if (!active) return;

      const metadataRole = session?.user.user_metadata?.role;
      const databaseRole = roleData?.role;
      setRole(databaseRole === "admin" || metadataRole === "admin" ? "admin" : "corretor");
      setUserEmail(session?.user.email ?? "");
      setProperties((propertyData || []) as Property[]);
      setLeads((leadData || []) as Lead[]);
      setPropertyMetrics((metricData || []) as PropertyMetric[]);
      setLeadOrigins((originData || []) as LeadOriginMetric[]);
      setLoading(false);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  function getStoragePathFromUrl(url: string) {
    const marker = "/storage/v1/object/public/property-images/";
    const index = url.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(url.slice(index + marker.length));
  }

  async function deleteProperty(property: Property) {
    if (role !== "admin") {
      alert("Apenas administradores podem excluir imóveis.");
      return;
    }

    const storagePaths = (property.images ?? [])
      .map(getStoragePathFromUrl)
      .filter(Boolean) as string[];

    if (storagePaths.length) {
      await supabase.storage.from("property-images").remove(storagePaths);
    }

    const { error } = await supabase.from("properties").delete().eq("id", property.id);

    if (error) {
      alert(error.message);
      return;
    }

    setProperties((old) => old.filter((item) => item.id !== property.id));
    setPropertyToDelete(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function renderSection() {
    if (activeSection === "dashboard") {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <MetricCard label="Total de imóveis" value={properties.length} />
            <MetricCard label="Imóveis ativos" value={activeCount} />
            <MetricCard label="Imóveis vendidos" value={properties.filter((property) => property.status === "vendido").length} />
            <MetricCard label="Leads recebidos" value={leads.length} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel title="Imóveis com melhor qualidade" className="xl:col-span-2">
              <div className="space-y-4">
                {topQuality.map((property) => (
                  <PropertyRow
                    key={property.id}
                    property={property}
                    onEdit={() => setSelectedProperty(property)}
                    onDelete={() => setPropertyToDelete(property)}
                    canDelete={role === "admin"}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Boas praticas">
              <div className="space-y-4 text-sm text-white/70">
                <AdminTip text="Preencha a localização com cidade, bairro e condomínio quando existir." />
                <AdminTip text="Adicione no mínimo 5 imagens em ordem de importância." />
                <AdminTip text="Use descrições completas para melhorar SEO e conversão." />
                <AdminTip text="Revise preço, metragem e vagas antes de publicar." />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel title="Imóveis mais vistos">
              <div className="space-y-3">
                {propertyMetrics
                  .filter((metric) => Number(metric.views_count ?? 0) > 0)
                  .slice(0, 5)
                  .map((metric) => (
                    <AdminListLine
                      key={metric.id}
                      label={metric.title || "Imóvel"}
                      value={Number(metric.views_count ?? 0)}
                    />
                  ))}
                {!propertyMetrics.some((metric) => Number(metric.views_count ?? 0) > 0) && (
                  <p className="text-sm text-white/50">Sem visualizações registradas ainda.</p>
                )}
              </div>
            </Panel>

            <Panel title="Mais favoritados">
              <div className="space-y-3">
                {propertyMetrics
                  .filter((metric) => Number(metric.favorites_count ?? 0) > 0)
                  .slice(0, 5)
                  .map((metric) => (
                    <AdminListLine
                      key={metric.id}
                      label={metric.title || "Imóvel"}
                      value={Number(metric.favorites_count ?? 0)}
                    />
                  ))}
                {!propertyMetrics.some((metric) => Number(metric.favorites_count ?? 0) > 0) && (
                  <p className="text-sm text-white/50">Favoritos ainda estão locais no navegador do usuário.</p>
                )}
              </div>
            </Panel>

            <Panel title="Leads por origem">
              <div className="space-y-3">
                {leadOrigins.map((origin) => (
                  <AdminListLine
                    key={origin.source}
                    label={origin.source}
                    value={Number(origin.total ?? 0)}
                  />
                ))}
                {!leadOrigins.length && (
                  <p className="text-sm text-white/50">Sem origens registradas ainda.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    if (activeSection === "imoveis") {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-6">
          <Panel title="Imóveis cadastrados">
            <div className="space-y-4">
              {properties.map((property) => (
                <PropertyRow
                  key={property.id}
                  property={property}
                  onEdit={() => setSelectedProperty(property)}
                  onDelete={() => setPropertyToDelete(property)}
                  canDelete={role === "admin"}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Cadastrar imóvel">
            <PropertyForm
              compact
              onSaved={(property) => {
                setProperties((current) => [property, ...current]);
              }}
            />
          </Panel>
        </div>
      );
    }

    if (activeSection === "leads") {
      return (
        <Panel title="Leads recebidos">
          {leads.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <strong>{lead.name ?? "Lead sem nome"}</strong>
                  <p className="text-white/50 mt-2">{lead.phone ?? lead.email ?? "Contato não informado"}</p>
                  <p className="text-white/50 mt-2">
                    Origem: {lead.source ?? "site"}
                    {lead.property_title ? ` - ${lead.property_title}` : ""}
                  </p>
                  {lead.property_slug && (
                    <a
                      href={`/imoveis/${lead.property_slug}`}
                      target="_blank"
                      className="mt-3 inline-flex text-sm text-[#72A3BF] hover:text-white"
                    >
                      Abrir imóvel
                    </a>
                  )}
                  <span className="mt-4 inline-flex rounded-full bg-[#72A3BF]/15 px-3 py-1 text-xs text-[#72A3BF]">
                    {lead.status ?? "novo"}
                  </span>
                  <p className="text-white/30 text-sm mt-4">{lead.created_at ?? "Data não informada"}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum lead encontrado ainda. Quando os formulários forem conectados ao Supabase, eles aparecem aqui." />
          )}
        </Panel>
      );
    }

    if (activeSection === "favoritos") {
      return (
        <Panel title="Favoritos e interesse">
          <EmptyState text="Base preparada para consolidar imóveis favoritos, comparações e interesse por usuário." />
        </Panel>
      );
    }

    if (role !== "admin") {
      return (
        <Panel title="Acesso restrito">
          <div className="flex gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-white/70">
            <Lock className="h-6 w-6 text-[#72A3BF]" />
            Esta área é exclusiva para administradores.
          </div>
        </Panel>
      );
    }

    if (activeSection === "corretores") {
      return (
        <Panel title="Corretores">
          <EmptyState text="Estrutura pronta para listar usuários autorizados, cargos e permissões." />
        </Panel>
      );
    }

    if (activeSection === "analytics") {
      return (
        <Panel title="Analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <MetricCard label="Mais vistos" value={0} icon={<Eye />} />
            <MetricCard label="Reservados" value={reservedCount} icon={<Heart />} />
            <MetricCard label="Conversoes" value={leads.length} icon={<BarChart3 />} />
          </div>
        </Panel>
      );
    }

    return (
      <Panel title="Configuracoes">
        <EmptyState text="Área reservada para SEO, pixels, CRM, WhatsApp e automações comerciais." />
      </Panel>
    );
  }

  return (
    <main className="admin-editorial min-h-screen bg-[#E0E8E6] text-[#030F18]">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-white/[0.03] p-4 md:p-6 xl:border-b-0 xl:border-r">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 md:rounded-[28px] md:p-6">
            <Image
              src="/brand/symbol-blue.png"
              alt="Privilege Imóveis"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-xs">
              Privilege
            </span>
            <h1 className="text-2xl font-bold mt-3">Admin OS</h1>
            <div className="mt-5 flex items-center gap-3 text-sm text-white/60">
              <Shield className="h-4 w-4 text-[#72A3BF]" />
              {getRoleLabel(role)}
            </div>
            <p className="text-white/40 text-sm mt-2 break-all">{userEmail}</p>
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:mt-6 xl:block xl:space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              const disabled = item.adminOnly && role !== "admin";

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  disabled={disabled}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 text-center text-sm transition xl:justify-start xl:gap-3 xl:px-4 xl:text-left ${
                    activeSection === item.id
                      ? "bg-[#72A3BF] text-black"
                      : "text-white/65 hover:bg-white/10"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            onClick={signOut}
            className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 text-white/60 hover:bg-white/10 xl:mt-8"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </aside>

        <section className="min-w-0 p-4 md:p-6 xl:p-10">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between xl:mb-10">
            <div>
              <Image
                src="/brand/logo-horizontal-blue.png"
                alt="Privilege Imóveis"
                width={288}
                height={64}
                priority
                className="mb-6 h-12 w-56 object-contain object-left md:mb-8 md:h-16 md:w-72"
              />
              <span className="text-xs uppercase tracking-[0.26em] text-[#72A3BF] md:text-sm md:tracking-[0.3em]">
                Central operacional
              </span>
              <h2 className="mt-4 text-[clamp(2.3rem,12vw,3.5rem)] font-bold">
                Painel Administrativo
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60 md:text-base">
                Gerencie catálogo, leads, qualidade dos anúncios e operação
                comercial em uma interface premium conectada ao site.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/admin/leads"
                className="flex h-12 items-center justify-center rounded-full border border-[#1D4052]/18 px-5 text-sm text-[#1D4052]"
              >
                Gerenciar leads
              </a>
              <a
                href="/admin/corretores"
                className="flex h-12 items-center justify-center rounded-full border border-[#1D4052]/18 px-5 text-sm text-[#1D4052]"
              >
                Gerenciar corretores
              </a>
            </div>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] md:h-96 md:rounded-[32px]">
              <div className="h-12 w-12 rounded-full border-4 border-[#72A3BF]/20 border-t-[#72A3BF] animate-spin" />
            </div>
          ) : (
            renderSection()
          )}
        </section>
      </div>

      <EditModal
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onSaved={(property) => {
          setProperties((current) =>
            current.map((item) => (item.id === property.id ? property : item))
          );
          setSelectedProperty(null);
        }}
      />

      {propertyToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/70 p-4 md:p-6">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#030F18] p-6 md:rounded-[32px] md:p-8">
            <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-xs">
              Confirmar exclusão
            </span>

            <h2 className="mt-4 text-2xl font-bold md:text-3xl">
              Excluir este imóvel?
            </h2>

            <p className="text-white/60 mt-4">
              Esta ação remove o imóvel do banco, da busca, das categorias e
              tenta remover as imagens vinculadas ao Storage.
            </p>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 mt-6">
              {propertyToDelete.title}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setPropertyToDelete(null)}
                className="h-12 rounded-2xl border border-white/10 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteProperty(propertyToDelete)}
                className="h-12 rounded-2xl bg-red-500/20 text-red-200 hover:bg-red-500/30"
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-white/50">{label}</p>
        {icon && <div className="text-[#72A3BF]">{icon}</div>}
      </div>
      <strong className="mt-5 block text-4xl md:mt-6 md:text-5xl">{value}</strong>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[32px] md:p-6 ${className}`}>
      <h3 className="mb-5 text-xl font-bold md:mb-6 md:text-2xl">{title}</h3>
      {children}
    </section>
  );
}

function PropertyRow({
  property,
  onEdit,
  onDelete,
  canDelete,
}: {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const quality = getPropertyQuality(property);

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:rounded-[24px] md:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-[#72A3BF] text-sm">{property.category}</p>
          <h4 className="text-xl font-semibold mt-2">
            {property.title || "Imóvel sem título"}
          </h4>
          <p className="text-white/50 mt-1">{property.location}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
              {property.status ?? "ativo"}
            </span>
            {property.minha_casa_minha_vida && (
              <span className="inline-flex rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-1 text-xs text-[#25D366]">
                Minha Casa Minha Vida
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 xl:min-w-48">
          <div className="flex items-center justify-between text-sm text-white/50 mb-2">
            <span>Qualidade</span>
            <span>{quality}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#72A3BF]" style={{ width: `${quality}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <button
            onClick={onEdit}
            className="h-11 rounded-full border border-white/10 px-5 transition hover:bg-white/10"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className="h-11 rounded-full bg-red-500/15 px-5 text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminTip({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      {text}
    </div>
  );
}

function AdminListLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className="min-w-0 truncate text-sm text-white/70">{label}</span>
      <strong className="text-[#72A3BF]">{value}</strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="min-h-72 rounded-[28px] border border-white/10 bg-black/20 flex flex-col items-center justify-center text-center px-6 text-white/60">
      <Image
        src="/brand/symbol-blue.png"
        alt=""
        aria-hidden="true"
        width={56}
        height={56}
        className="mb-5 h-14 w-14 object-contain opacity-20"
      />
      <span>{text}</span>
    </div>
  );
}
