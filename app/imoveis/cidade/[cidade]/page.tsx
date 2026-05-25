import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PropertyCard } from "@/components/PropertyCard";
import { createServerClient } from "@/lib/supabase-server";
import { normalizeText } from "@/lib/property-filters";
import { attachPropertyImages } from "@/lib/property-media";
import { Property, PropertyImage } from "@/types/property";

interface CityPageProps {
  params: Promise<{
    cidade: string;
  }>;
}

function cityLabel(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { cidade } = await params;
  const label = cityLabel(cidade);

  return {
    title: `Imóveis em ${label}`,
    description: `Seleção premium de imóveis em ${label} com curadoria Privilege Imóveis.`,
    alternates: {
      canonical: `/imoveis/cidade/${cidade}`,
    },
    openGraph: {
      title: `Imóveis em ${label} | Privilege Imóveis`,
      description: `Casas, apartamentos, terrenos e oportunidades premium em ${label}.`,
      url: `/imoveis/cidade/${cidade}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { cidade } = await params;
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
  ).filter((property) => {
    const slug = property.city_slug || normalizeText(property.city || "").replace(/\s+/g, "-");
    return slug === cidade;
  });
  const label = cityLabel(cidade);

  return (
    <main className="text-[#030F18]">
      <Navbar />

      <section className="px-4 pb-20 pt-32 md:pb-24 md:pt-40">
        <div className="premium-shell">
          <div className="mb-10 max-w-5xl md:mb-14">
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
              SEO local
            </span>

            <h1 className="mt-5 text-[clamp(2.75rem,13vw,7rem)] font-semibold leading-[0.96] md:mt-6 md:leading-[0.94]">
              Imóveis em {label}.
            </h1>
          </div>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-[34px] border border-[#446E87]/14 bg-[#D7E1DF]/50 px-6 text-center text-[#030F18]/56">
              Nenhum imóvel encontrado nesta cidade no momento.
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
