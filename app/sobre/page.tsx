import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
                A Privilege Imóveis nasceu para oferecer uma experiência
                imobiliária sofisticada, moderna e altamente personalizada.
              </p>

              <p className="mt-6 text-base leading-7 text-[#030F18]/68 md:mt-8 md:text-lg md:leading-8">
                Nosso foco está em imóveis de alto padrão, oportunidades
                exclusivas e atendimento premium para clientes que valorizam
                conforto, localização e investimento inteligente.
              </p>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[#446E87]/14 shadow-[0_24px_80px_rgba(3,15,24,0.07)] md:rounded-[32px]">
              <img
                src="https://images.unsplash.com/photo-1600585154526-990dced4db0d"
                alt="Privilege Imóveis"
                className="aspect-[4/5] h-auto w-full object-cover md:aspect-[16/11]"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
