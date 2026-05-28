import Image from "next/image";
import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LeadForm } from "@/components/LeadForm";
import {
  absoluteUrl,
  companyEmail,
  companyPhoneDisplay,
  companyWhatsApp,
  defaultOgImage,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato | Privilege Imóveis",
  description:
    "Fale com especialistas da Privilege Imóveis em Campina Grande para comprar, vender, alugar ou avaliar imóveis na Paraíba.",
  alternates: {
    canonical: "/contato",
  },
  openGraph: {
    title: "Contato | Privilege Imóveis",
    description:
      "Atendimento imobiliário em Campina Grande e Paraíba.",
    url: "/contato",
    type: "website",
    images: [{ url: absoluteUrl(defaultOgImage), alt: "Contato Privilege Imóveis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contato | Privilege Imóveis",
    description: "Fale com especialistas da Privilege Imóveis.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

const socialLinks = [
  {
    label: "WhatsApp",
    href: `https://wa.me/${companyWhatsApp}`,
    icon: "/social/whatsapp.png",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/privilegeimoveis",
    icon: "/social/instagram.png",
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: "/social/youtube.png",
  },
  {
    label: "TikTok",
    href: "https://tiktok.com",
    icon: "/social/tiktok.png",
  },
];

export default function ContactPage() {
  return (
    <main className="text-[#030F18]">
      <Navbar />

      <section className="px-5 pb-20 pt-32 md:px-6 md:pb-24 md:pt-40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-20">
          <div className="rounded-[30px] border border-[#446E87]/12 bg-[#D7E1DF]/42 p-6 shadow-[0_24px_80px_rgba(3,15,24,0.05)] backdrop-blur-xl md:rounded-[38px] md:p-10">
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
              Contato
            </span>

            <h1 className="mt-5 text-[clamp(2.7rem,13vw,4.5rem)] font-bold leading-[1.02] md:mt-6 md:leading-tight">
              Fale com nossos especialistas.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#030F18]/62 md:mt-8 md:text-lg md:leading-8">
              Atendimento para clientes que buscam imóveis bem localizados,
              orientação clara e uma negociação segura.
            </p>

            <div className="mt-10 grid gap-4 text-[#030F18]/68 md:mt-12">
              <ContactLine label="Localização" value="Campina Grande - Paraíba" />
              <ContactLine label="E-mail" value={companyEmail} highlight />
              <ContactLine label="Telefone" value={companyPhoneDisplay} />
            </div>

            <div className="mt-8 flex items-center gap-3 md:mt-10">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="group flex h-12 w-12 items-center justify-center rounded-full border border-[#030F18]/8 bg-[#E0E8E6]/70 shadow-[0_12px_36px_rgba(3,15,24,0.05)] transition duration-500 hover:-translate-y-1 hover:border-[#030F18]/18 hover:bg-white/60"
                >
                  <Image
                    src={item.icon}
                    alt=""
                    aria-hidden="true"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain transition duration-500 group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>

          <LeadForm source="contato" />
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ContactLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#446E87]/12 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-xs uppercase tracking-[0.28em] text-[#446E87]">
        {label}
      </span>
      <span
        className={`text-left text-sm sm:text-right md:text-base ${
          highlight ? "font-medium text-[#030F18]" : "text-[#030F18]/62"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
