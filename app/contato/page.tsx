import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LeadForm } from "@/components/LeadForm";
import { Camera, MessageCircle, Music2, Play } from "lucide-react";

const socialLinks = [
  {
    label: "WhatsApp",
    href: "https://wa.me/5583999999999",
    icon: MessageCircle,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/privilegeimoveis",
    icon: Camera,
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: Play,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com",
    icon: Music2,
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
                Atendimento premium para clientes que buscam imoveis exclusivos
                e oportunidades estrategicas.
            </p>

            <div className="mt-10 grid gap-4 text-[#030F18]/68 md:mt-12">
              <ContactLine label="Localizacao" value="Campina Grande - Paraiba" />
              <ContactLine
                label="Email"
                value="contato@privilegeimoveis.com.br"
                highlight
              />
              <ContactLine label="Telefone" value="(83) 99999-9999" />
            </div>

            <div className="mt-8 flex items-center gap-3 md:mt-10">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                const isWhatsApp = item.label === "WhatsApp";

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className={`group flex h-12 w-12 items-center justify-center rounded-full shadow-[0_12px_36px_rgba(3,15,24,0.05)] transition duration-500 hover:-translate-y-1 ${
                      isWhatsApp
                        ? "border border-[#25D366] bg-[#25D366] text-white hover:border-[#1FB857] hover:bg-[#1FB857]"
                        : "border border-[#030F18]/8 bg-[#E0E8E6]/70 text-[#030F18] hover:border-[#030F18] hover:bg-[#030F18] hover:text-[#E0E8E6]"
                    }`}
                  >
                    <Icon className="h-4 w-4 transition duration-500 group-hover:scale-105" />
                  </a>
                );
              })}
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
