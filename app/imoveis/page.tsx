import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PropertyCatalog } from "@/components/PropertyCatalog";

import { createServerClient } from "@/lib/supabase-server";
import { attachPropertyImages } from "@/lib/property-media";
import { Property, PropertyImage } from "@/types/property";

export default async function PropertiesPage() {
  const supabase = createServerClient();

  const [{ data }, { data: imageData }] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("property_images")
      .select("property_id,url,is_main,sort_order"),
  ]);

  const properties = attachPropertyImages(
    (data || []) as Property[],
    (imageData || []) as PropertyImage[]
  );

  return (
    <main className="text-[#030F18]">
      <Navbar />

      <section className="px-4 pb-20 pt-32 md:pb-24 md:pt-40">
        <div className="premium-shell">
          <div className="mb-10 max-w-5xl md:mb-14">
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
              Central de imóveis
            </span>

            <h1 className="mt-5 text-[clamp(2.65rem,13vw,7rem)] font-semibold leading-[0.96] md:mt-6">
              Encontre o imóvel ideal com filtros inteligentes.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-[#030F18]/56 md:mt-8 md:text-lg md:leading-8">
              Busque por categoria, localização, faixa de valor e quantidade
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
