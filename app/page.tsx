import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { Hero } from "@/sections/Hero";
import { FeaturedProperties } from "@/sections/FeaturedProperties";
import { Categories } from "@/sections/Categories";
import { About } from "@/sections/about";
import { CTA } from "@/sections/cta";

import { createServerClient } from "@/lib/supabase-server";
import { attachPropertyImages } from "@/lib/property-media";
import { publicPropertyQuery } from "@/lib/property-publication";
import { absoluteUrl, defaultOgImage } from "@/lib/site";
import { Property, PropertyImage } from "@/types/property";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Privilege Imóveis | Imobiliária em Campina Grande",
  description:
    "Imobiliária em Campina Grande e Paraíba para quem busca imóveis bem localizados, atendimento claro e orientação segura.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Privilege Imóveis | Imobiliária em Campina Grande",
    description:
      "Encontre casas, apartamentos, condomínios e terrenos com atendimento especializado da Privilege Imóveis.",
    url: "/",
    type: "website",
    images: [{ url: absoluteUrl(defaultOgImage), alt: "Privilege Imóveis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privilege Imóveis",
    description: "Imobiliária em Campina Grande e Paraíba.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

export default async function Home() {
  const supabase = createServerClient();
  const { query } = await publicPropertyQuery(supabase);

  const [{ data: propertyData, error: propertyError }, { data: imageData }] = await Promise.all([
    query.order("featured", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }).limit(4),
    supabase
      .from("property_images")
      .select("property_id,url,is_main,sort_order"),
  ]);

  if (propertyError) throw new Error("Não foi possível consultar os imóveis em destaque.");
  const properties = attachPropertyImages(
    (propertyData || []) as Property[],
    (imageData || []) as PropertyImage[]
  );

  return (
    <main className="overflow-hidden">
      <Navbar />
      <Hero />
      <FeaturedProperties properties={properties} />
      <Categories />
      <About />
      <CTA />
      <Footer />
    </main>
  );
}
