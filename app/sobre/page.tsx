import Image from "next/image";
import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { absoluteUrl, defaultOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sobre a Privilege Imóveis",
  description:
    "Conheça a Privilege Imóveis, uma imobiliária em Campina Grande com atendimento claro, próximo e especializado.",
  alternates: {
    canonical: "/sobre",
  },
  openGraph: {
    title: "Sobre a Privilege Imóveis",
    description:
      "Imobiliária em Campina Grande para quem busca comprar, vender ou alugar com mais segurança.",
    url: "/sobre",
    type: "website",
    images: [{ url: absoluteUrl(defaultOgImage), alt: "Privilege Imóveis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre a Privilege Imóveis",
    description: "Imobiliária em Campina Grande com atendimento claro e especializado.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

export default function AboutPage() {
  return (
    <main className="text-[#030F18]">
      <Navbar />

      <section className="px-5 pb-20 pt-32 md:px-6 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
            Sobre a Privilege
          </span>

          <h1 className="mt-5 max-w-4xl text-[clamp(2.75rem,13vw,4.5rem)] font-bold leading-[1.02] md:mt-6 md:leading-tight">
            Onde o privilégio tem endereço.
          </h1>

          <div className="mt-12 grid grid-cols-1 gap-10 lg:mt-20 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-base leading-7 text-[#030F18]/68 md:text-lg md:leading-8">
                A Privilege Imóveis é uma imobiliária criada para ajudar você a
                comprar, vender ou alugar com clareza em cada etapa.
              </p>

              <p className="mt-6 text-base leading-7 text-[#030F18]/68 md:mt-8 md:text-lg md:leading-8">
                Apresentamos imóveis bem localizados, explicamos as opções com
                objetividade e acompanhamos sua decisão com atendimento próximo
                e seguro.
              </p>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-[#446E87]/14 shadow-[0_24px_80px_rgba(3,15,24,0.07)] md:aspect-[16/11] md:rounded-[32px]">
              <Image
                src="https://images.unsplash.com/photo-1600585154526-990dced4db0d"
                alt="Privilege Imóveis"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
