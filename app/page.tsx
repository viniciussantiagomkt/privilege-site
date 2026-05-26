import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { Hero } from "@/sections/Hero";
import { FeaturedProperties } from "@/sections/FeaturedProperties";
import { Categories } from "@/sections/Categories";
import { About } from "@/sections/about";
import { CTA } from "@/sections/cta";

import { createServerClient } from "@/lib/supabase-server";
import { attachPropertyImages } from "@/lib/property-media";
import { absoluteUrl, defaultOgImage } from "@/lib/site";
import { Property, PropertyImage } from "@/types/property";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privilege Imóveis | Curadoria imobiliária premium na Paraíba",
  description:
    "Imóveis de alto padrão em Campina Grande e Paraíba com curadoria premium, atendimento especializado e experiência imobiliária sofisticada.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Privilege Imóveis | Curadoria imobiliária premium",
    description:
      "Explore casas, apartamentos, condomínios e terrenos selecionados pela Privilege Imóveis.",
    url: "/",
    type: "website",
    images: [{ url: absoluteUrl(defaultOgImage), alt: "Privilege Imóveis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privilege Imóveis",
    description: "Curadoria imobiliária premium em Campina Grande e Paraíba.",
    images: [absoluteUrl(defaultOgImage)],
  },
};

export default async function Home() {
  const supabase =
    createServerClient();

  const [{ data: propertyData }, { data: imageData }] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("property_images")
      .select("property_id,url,is_main,sort_order"),
  ]);

  const properties = attachPropertyImages(
    (propertyData || []) as Property[],
    (imageData || []) as PropertyImage[]
  );

  return (
    <main className="overflow-hidden">
      <Navbar />

      <Hero />

      <FeaturedProperties
        properties={properties}
      />

      <Categories />

      <About />

      <CTA />

      <Footer />
    </main>
  );
}
