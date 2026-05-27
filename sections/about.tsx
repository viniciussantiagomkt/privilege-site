import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/Reveal";

export function About() {
  return (
    <section className="py-20 text-[#030F18] md:py-28">
      <Reveal>
        <div className="premium-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
              Sobre a Privilege
            </span>

            <h2 className="mt-5 text-[clamp(2.6rem,13vw,6.2rem)] font-semibold leading-[0.96] text-[#1D4052] md:leading-[0.94]">
              Uma imobiliária para decisões mais seguras.
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-[#030F18]/58 md:mt-8 md:text-lg md:leading-8">
              A Privilege ajuda você a encontrar, vender ou alugar imóveis com
              atendimento próximo, informações claras e visão de mercado.
            </p>

            <Link href="/sobre" className="premium-cta mt-8 min-h-12 px-7 md:mt-10">
              Conhecer a empresa
            </Link>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-[30px] border border-[#446E87]/14 bg-[#E0E8E6]/58 p-2 shadow-[0_24px_80px_rgba(3,15,24,0.08)] md:rounded-[44px]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] md:h-[560px] md:aspect-auto md:rounded-[36px]">
                <Image
                  src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=2070&auto=format&fit=crop"
                  alt="Casa com arquitetura contemporânea"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030F18]/70 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
