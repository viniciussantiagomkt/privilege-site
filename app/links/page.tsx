import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  Building2,
  Gem,
  KeyRound,
  PlayCircle,
  UsersRound,
} from "lucide-react";

import { createServerClient } from "@/lib/supabase-server";
import { attachPropertyImages } from "@/lib/property-media";
import { publicPropertyStatuses } from "@/lib/property-filters";
import { absoluteUrl, companyWhatsApp, defaultOgImage } from "@/lib/site";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import { Property, PropertyImage } from "@/types/property";
import { TrackedLink } from "@/components/TrackedLink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Central Digital Privilege | Privilege Imóveis",
  description:
    "Acesso rápido para imóveis, lançamentos, tours, especialistas e atendimento da Privilege Imóveis em Campina Grande.",
  alternates: {
    canonical: "/links",
  },
  openGraph: {
    title: "Central Digital Privilege",
    description:
      "Acesso rápido para imóveis, lançamentos, equipe e atendimento da Privilege Imóveis.",
    url: "/links",
    type: "website",
    images: [{ url: absoluteUrl(defaultOgImage), alt: "Privilege Imóveis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Central Digital Privilege",
    description: "Imóveis selecionados em Campina Grande.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

const whatsappUrl = createWhatsAppUrl(
  companyWhatsApp,
  "Olá! Vim pela Central Digital da Privilege Imóveis e gostaria de falar com um especialista."
);

const mainLinks = [
  {
    label: "Atendimento Privilege",
    href: whatsappUrl,
    external: true,
    whatsapp: true,
  },
  {
    label: "Alto padrão",
    href: "/imoveis?preco=acima-2milhoes&ordenar=destaque",
    icon: Gem,
  },
  {
    label: "Lançamentos",
    href: "/imoveis/categoria/na-planta",
    icon: Building2,
  },
  {
    label: "Primeiro imóvel",
    href: "/imoveis/categoria/minha-casa-minha-vida",
    icon: KeyRound,
  },
  {
    label: "Tours completos",
    href: "https://youtube.com",
    icon: PlayCircle,
    external: true,
  },
  {
    label: "Conheça nossos especialistas",
    href: "/corretores",
    icon: UsersRound,
  },
];

export default async function LinksPage() {
  const supabase = createServerClient();

  const [{ data: propertyData }, { data: imageData }] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .in("status", publicPropertyStatuses)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("property_images")
      .select("property_id,url,is_main,sort_order"),
  ]);

  const featuredProperty = attachPropertyImages(
    (propertyData || []) as Property[],
    (imageData || []) as PropertyImage[]
  )[0];

  return (
    <main className="min-h-screen overflow-hidden bg-[#E0E8E6] px-5 py-8 text-[#030F18] sm:px-6 lg:py-10">
      <div className="pointer-events-none fixed -right-28 top-16 h-80 w-80 rounded-full bg-[#72A3BF]/10 blur-3xl" />
      <div className="pointer-events-none fixed -left-36 bottom-10 h-96 w-96 rounded-full bg-[#1D4052]/10 blur-3xl" />

      <section className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <div className="rounded-[34px] border border-[#446E87]/14 bg-[#D7E1DF]/46 p-6 shadow-[0_24px_90px_rgba(3,15,24,0.07)] backdrop-blur-2xl sm:p-8">
            <Link href="/" aria-label="Privilege Imóveis">
              <Image
                src="/brand/logo-horizontal-blue.png"
                alt="Privilege Imóveis"
                width={220}
                height={64}
                priority
                className="h-auto w-44 object-contain sm:w-52"
              />
            </Link>

            <div className="mt-12">
              <span className="text-xs uppercase tracking-[0.3em] text-[#446E87]">
                Central Digital Privilege
              </span>
              <h1 className="mt-5 text-[clamp(3rem,14vw,5.8rem)] font-semibold leading-[0.94] text-[#1D4052]">
                Onde o privilégio tem endereço.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[#030F18]/62 sm:text-lg">
                Imóveis selecionados em Campina Grande.
              </p>
            </div>

            <div className="mt-10 grid gap-3">
              {mainLinks.map((item) => {
                const Icon = item.icon;
                const className = item.whatsapp
                  ? "group flex min-h-16 items-center justify-between rounded-2xl border border-[#25D366] bg-[#25D366] px-5 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(37,211,102,0.22)] transition duration-500 hover:-translate-y-0.5 hover:border-[#1fb456] hover:bg-[#1fb456]"
                  : "group flex min-h-14 items-center justify-between rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/54 px-5 text-sm font-medium text-[#1D4052] transition duration-500 hover:-translate-y-0.5 hover:border-[#1D4052]/30 hover:bg-white/35";

                const content = (
                  <>
                    <span className="flex items-center gap-3">
                      {item.whatsapp ? (
                        <Image
                          src="/social/whatsapp.png"
                          alt=""
                          width={28}
                          height={28}
                          aria-hidden="true"
                          className="h-7 w-7 object-contain"
                        />
                      ) : Icon ? (
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      ) : null}
                      {item.label}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 opacity-60 transition duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </>
                );

                if (item.external) {
                  return (
                    <TrackedLink
                      key={item.label}
                      href={item.href}
                      external
                      className={className}
                      eventName="CentralDigitalClick"
                      eventPayload={{
                        label: item.label,
                        source: "links",
                        type: item.whatsapp ? "whatsapp" : "external",
                        button_location: item.whatsapp ? "links_hub" : "links_external",
                      }}
                      trackLead={Boolean(item.whatsapp)}
                    >
                      {content}
                    </TrackedLink>
                  );
                }

                return (
                  <TrackedLink
                    key={item.label}
                    href={item.href}
                    className={className}
                    eventName="CentralDigitalClick"
                    eventPayload={{
                      label: item.label,
                      source: "links",
                      type: "internal",
                    }}
                  >
                    {content}
                  </TrackedLink>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <FeaturedLinkProperty property={featuredProperty} />

          <div className="rounded-[30px] border border-[#446E87]/14 bg-[#D7E1DF]/38 p-5 text-sm leading-6 text-[#030F18]/58 sm:p-7">
            <strong className="block text-base font-medium text-[#1D4052]">
              Uma recepção online para quem chega pelos nossos conteúdos.
            </strong>
            <span className="mt-2 block">
              Escolha o caminho mais próximo do que você procura ou fale direto
              com a equipe pelo WhatsApp.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeaturedLinkProperty({ property }: { property?: Property }) {
  if (!property) {
    return (
      <div className="rounded-[30px] border border-[#446E87]/14 bg-[#D7E1DF]/38 p-7 text-[#030F18]/58">
        <span className="text-xs uppercase tracking-[0.28em] text-[#446E87]">
          Destaque da semana
        </span>
        <p className="mt-4 text-lg font-medium text-[#1D4052]">
          Novas oportunidades serão apresentadas em breve.
        </p>
      </div>
    );
  }

  const image =
    property.main_image_url ||
    property.images?.find(Boolean) ||
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85";

  return (
    <TrackedLink
      href={`/imoveis/${property.slug}`}
      className="group overflow-hidden rounded-[30px] border border-[#446E87]/14 bg-[#D7E1DF]/44 p-2 shadow-[0_24px_80px_rgba(3,15,24,0.06)] transition duration-700 hover:-translate-y-1 hover:bg-[#D7E1DF]/58"
      eventName="CentralDigitalClick"
      eventPayload={{
        label: "Destaque da semana",
        property_slug: property.slug,
        property_title: property.title,
        source: "links",
        type: "featured_property",
      }}
    >
      <div className="relative overflow-hidden rounded-[24px]">
        <Image
          src={image}
          alt={property.title}
          width={1100}
          height={760}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="aspect-[16/10] w-full object-cover transition duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030F18]/72 via-[#030F18]/10 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 text-[#E0E8E6]">
          <span className="text-xs uppercase tracking-[0.28em] text-[#E0E8E6]/72">
            Destaque da semana
          </span>
          <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
            {property.title}
          </h2>
          <p className="mt-2 text-sm text-[#E0E8E6]/78">
            {[property.neighborhood, property.city].filter(Boolean).join(" - ") ||
              property.location}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 px-3 py-5">
        <strong className="text-lg font-semibold text-[#1D4052]">
          {property.price || "Sob consulta"}
        </strong>
        <span className="inline-flex h-11 items-center rounded-full border border-[#1D4052]/22 px-5 text-sm text-[#1D4052] transition duration-500 group-hover:border-[#1D4052] group-hover:bg-[#1D4052] group-hover:text-[#E0E8E6]">
          Conhecer imóvel
        </span>
      </div>
    </TrackedLink>
  );
}
