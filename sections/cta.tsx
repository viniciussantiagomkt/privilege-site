import { Reveal } from "@/components/Reveal";
import { WhatsAppLeadButton } from "@/components/WhatsAppLeadButton";
import { companyWhatsApp } from "@/lib/site";
import Link from "next/link";

export function CTA() {
  return (
    <section className="py-20 text-[#E0E8E6] md:py-28">
      <Reveal>
        <div className="premium-shell">
          <div className="relative overflow-hidden rounded-[30px] border border-[#030F18]/10 bg-[#030F18] p-2 shadow-[0_30px_120px_rgba(3,15,24,0.16)] md:rounded-[48px]">
            <div className="relative overflow-hidden rounded-[24px] px-5 py-14 text-center md:rounded-[40px] md:px-16 md:py-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(114,163,191,0.12),transparent_34rem)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#1D4052]/16 to-[#030F18]" />

              <div className="relative z-10">
                <span className="text-xs uppercase tracking-[0.28em] text-[#E0E8E6] md:text-sm md:tracking-[0.34em]">
                  Exclusividade
                </span>

                <h2
                  className="mx-auto mt-5 max-w-5xl text-[clamp(2.35rem,12vw,6.4rem)] font-semibold leading-[0.98] md:mt-6 md:leading-[0.95]"
                  style={{ color: "#E0E8E6" }}
                >
                  O imóvel certo pode mudar a forma como você vive a cidade.
                </h2>

                <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:items-center md:mt-12 md:flex-row">
                  <WhatsAppLeadButton
                    href={`https://wa.me/${companyWhatsApp}`}
                    label="Falar com especialista"
                    source="cta-final"
                    buttonLocation="home_final_cta"
                    className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#1D4052] bg-[#1D4052] px-8 text-[#E0E8E6] shadow-[0_20px_60px_rgba(29,64,82,0.32)] transition duration-500 hover:border-[#446E87] hover:bg-[#446E87]"
                  />

                  <Link href="/imoveis" className="inline-flex h-14 items-center justify-center rounded-full border border-[#1D4052] bg-transparent px-8 text-[#E0E8E6] transition duration-500 hover:border-[#1D4052] hover:bg-[#1D4052] hover:text-[#E0E8E6]">
                    Explorar imóveis
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
