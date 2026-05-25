import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PropertyCatalog } from "@/components/PropertyCatalog";

import { createServerClient } from "@/lib/supabase-server";
import { Property } from "@/types/property";

export default async function PropertiesPage() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  const properties = (data || []) as Property[];

  return (
    <main className="text-[#030F18]">
      <Navbar />

      <section className="px-4 pb-20 pt-32 md:pb-24 md:pt-40">
        <div className="premium-shell">
          <div className="mb-10 max-w-5xl md:mb-14">
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
              Central de imoveis
            </span>

            <h1 className="mt-5 text-[clamp(2.65rem,13vw,7rem)] font-semibold leading-[0.96] md:mt-6">
              Encontre o imovel ideal com filtros inteligentes.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-[#030F18]/56 md:mt-8 md:text-lg md:leading-8">
              Busque por categoria, localizacao, faixa de valor e quantidade
              de quartos em uma vitrine conectada ao banco de dados.
            </p>
          </div>

          <PropertyCatalog properties={properties} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
