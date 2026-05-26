import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumb } from "@/components/Breadcrumb";

import { createServerClient } from "@/lib/supabase-server";
import {
  filterProperties,
  propertyCategories,
  slugToCategoryLabel,
} from "@/lib/property-filters";
import { attachPropertyImages } from "@/lib/property-media";
import { absoluteUrl, defaultOgImage } from "@/lib/site";
import { Property, PropertyImage } from "@/types/property";

interface CategoryPageProps {
  params: Promise<{
    categoria: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categoria } = await params;
  const categoryLabel = slugToCategoryLabel(categoria);
  const path = `/imoveis/categoria/${categoria}`;
  const title = `${categoryLabel} em Campina Grande e Paraíba`;
  const description = `Curadoria Privilege de ${categoryLabel.toLowerCase()} em Campina Grande e Paraíba com atendimento imobiliário premium.`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | Privilege Imóveis`,
      description,
      url: path,
      type: "website",
      images: [{ url: absoluteUrl(defaultOgImage), alt: categoryLabel }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Privilege Imóveis`,
      description,
      images: [absoluteUrl(defaultOgImage)],
    },
  };
}

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { categoria } = await params;

  const categoryExists = propertyCategories.some(
    (category) => category.value === categoria
  );

  if (!categoryExists) {
    return notFound();
  }

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

  const properties = filterProperties(
    attachPropertyImages(
      (data || []) as Property[],
      (imageData || []) as PropertyImage[]
    ),
    {
      categoria,
    }
  );

  const categoryLabel = slugToCategoryLabel(categoria);
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${categoryLabel} | Privilege Imóveis`,
    url: absoluteUrl(`/imoveis/categoria/${categoria}`),
    itemListElement: properties.map((property, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/imoveis/${property.slug}`),
      name: property.title,
    })),
  };

  return (
    <main className="text-[#030F18]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Navbar />

      <section className="px-5 pb-20 pt-32 md:px-6 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <Breadcrumb
            items={[
              {
                label: "Home",
                href: "/",
              },
              {
                label: "Imóveis",
                href: "/imoveis",
              },
              {
                label: categoryLabel,
              },
            ]}
          />

          <div className="mb-10 mt-8 md:mb-14 md:mt-10">
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
              Categoria
            </span>

            <h1 className="mt-5 text-[clamp(2.75rem,13vw,4.5rem)] font-bold leading-[1.02] md:mt-6">
              {categoryLabel}
            </h1>

            <p className="mt-5 text-base leading-7 text-[#030F18]/56 md:mt-6 md:text-lg">
              {properties.length} imóveis encontrados nesta categoria.
            </p>
          </div>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/50 p-6 text-center md:rounded-[32px] md:p-10">
              <h2 className="text-2xl font-bold md:text-3xl">
                Nenhum imóvel encontrado nesta categoria.
              </h2>

              <p className="mt-4 text-[#030F18]/56">
                Veja a central completa ou fale com a equipe para buscar
                oportunidades exclusivas.
              </p>

              <Link
                href={`/imoveis?categoria=${categoria}`}
                className="mt-8 inline-flex h-14 items-center justify-center rounded-full border border-[#1D4052] px-7 text-[#1D4052] transition duration-500 hover:border-[#446E87]/45 hover:bg-white/35"
              >
                Abrir busca filtrada
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
