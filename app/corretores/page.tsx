import Image from "next/image";
import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppLeadButton } from "@/components/WhatsAppLeadButton";
import { createServerClient } from "@/lib/supabase-server";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import { absoluteUrl, defaultOgImage } from "@/lib/site";
import { Broker } from "@/types/property";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Corretores especialistas | Privilege Imóveis",
  description:
    "Conheça os corretores da Privilege Imóveis em Campina Grande, especialistas em imóveis premium, casas em condomínio e oportunidades na Paraíba.",
  alternates: {
    canonical: "/corretores",
  },
  openGraph: {
    title: "Corretores especialistas | Privilege Imóveis",
    description:
      "Equipe de atendimento imobiliário premium em Campina Grande e Paraíba.",
    url: "/corretores",
    type: "website",
    images: [{ url: absoluteUrl(defaultOgImage), alt: "Corretores Privilege Imóveis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Corretores Privilege Imóveis",
    description:
      "Especialistas em imóveis premium em Campina Grande e Paraíba.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

function normalizeInstagram(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

export default async function AgentsPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("brokers")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  const agents = (data || []) as Broker[];

  const agentsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: agents.map((agent, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "RealEstateAgent",
        name: agent.name || agent.email,
        email: agent.email,
        telephone: agent.phone || agent.whatsapp,
        image: agent.avatar_url || absoluteUrl(defaultOgImage),
        url: absoluteUrl("/corretores"),
      },
    })),
  };

  return (
    <main className="text-[#030F18]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentsJsonLd) }}
      />
      <Navbar />

      <section className="px-5 pb-20 pt-32 md:px-6 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
            Corretores
          </span>

          <h1 className="mt-5 text-[clamp(2.8rem,13vw,4.5rem)] font-bold leading-[1.02] md:mt-6">
            Especialistas Privilege.
          </h1>

          <div className="mt-12 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-2 md:gap-10">
            {agents.map((agent) => {
              const whatsappUrl = createWhatsAppUrl(
                agent.whatsapp || agent.phone,
                "Olá! Vi seu perfil no site da Privilege Imóveis e gostaria de falar sobre imóveis disponíveis."
              );
              const instagram = normalizeInstagram(agent.instagram);

              return (
                <div
                  key={agent.id}
                  className="group overflow-hidden rounded-[32px] border border-[#446E87]/14 bg-[#D7E1DF]/55 shadow-[0_24px_80px_rgba(3,15,24,0.06)] transition duration-700 hover:-translate-y-1 hover:border-[#446E87]/24 hover:shadow-[0_30px_90px_rgba(3,15,24,0.09)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={agent.avatar_url || "/brand/symbol-blue.png"}
                      alt={agent.name || "Corretor Privilege"}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-1000 group-hover:scale-[1.025]"
                    />
                  </div>

                  <div className="p-6 md:p-8">
                    <h2 className="text-2xl font-semibold md:text-3xl">{agent.name}</h2>
                    <p className="mt-3 text-[#030F18]/52">
                      {agent.position || agent.role_title || "Corretor Privilege"}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[#446E87]">
                      {agent.creci || "CRECI 839J"}
                    </p>
                    {agent.bio && (
                      <p className="mt-5 text-sm leading-6 text-[#030F18]/58">{agent.bio}</p>
                    )}

                    <div className="mt-7 flex items-center gap-3 md:mt-8">
                      <WhatsAppLeadButton
                        href={whatsappUrl}
                        label="Falar com corretor"
                        brokerName={agent.name || agent.email || null}
                        buttonLocation="broker_card"
                        source="corretor-whatsapp"
                        className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#25D366] bg-[#25D366] px-5 py-3 text-white shadow-[0_18px_50px_rgba(37,211,102,0.16)] transition duration-500 hover:border-[#1FB857] hover:bg-[#1FB857] sm:flex-none md:px-6 md:py-4"
                      />

                      {instagram && (
                        <a
                          href={instagram}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Instagram de ${agent.name}`}
                          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#1D4052]/12 bg-transparent transition duration-500 hover:-translate-y-1 hover:border-[#1D4052] hover:bg-white/45"
                        >
                          <Image
                            src="/social/instagram.png"
                            alt=""
                            aria-hidden="true"
                            width={28}
                            height={28}
                            className="h-7 w-7 object-contain transition duration-500 hover:scale-105"
                          />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!agents.length && (
              <div className="rounded-[32px] border border-[#446E87]/14 bg-[#D7E1DF]/55 p-8 text-center md:col-span-2 md:p-12">
                <Image
                  src="/brand/symbol-blue.png"
                  alt=""
                  aria-hidden="true"
                  width={56}
                  height={56}
                  className="mx-auto mb-5 h-14 w-14 object-contain opacity-20"
                />
                <h2 className="text-3xl font-semibold text-[#1D4052]">
                  Equipe em atualização.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[#030F18]/58">
                  Os corretores ativos cadastrados no painel administrativo aparecerão aqui automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
