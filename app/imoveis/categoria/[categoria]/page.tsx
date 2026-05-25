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
import { Property } from "@/types/property";

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

  return {
    title: `${categoryLabel} | Privilege Imoveis`,
    description: `Curadoria Privilege de ${categoryLabel.toLowerCase()} com atendimento imobiliario premium.`,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${categoryLabel} | Privilege Imoveis`,
      description: `Explore ${categoryLabel.toLowerCase()} selecionados pela Privilege Imoveis.`,
      url: path,
      type: "website",
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

  const { data } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  const properties = filterProperties((data || []) as Property[], {
    categoria,
  });

  const categoryLabel = slugToCategoryLabel(categoria);

  return (
    <main className="text-[#030F18]">
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
                label: "Imoveis",
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
              {properties.length} imoveis encontrados nesta categoria.
            </p>
          </div>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/50 p-6 text-center md:rounded-[32px] md:p-10">
              <h2 className="text-2xl font-bold md:text-3xl">
                Nenhum imovel nesta categoria
              </h2>

              <p className="text-[#030F18]/56 mt-4">
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
