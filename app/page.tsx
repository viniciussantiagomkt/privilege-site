import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { Hero } from "@/sections/Hero";
import { FeaturedProperties } from "@/sections/FeaturedProperties";
import { Categories } from "@/sections/Categories";
import { About } from "@/sections/about";
import { CTA } from "@/sections/cta";

import { createServerClient } from "@/lib/supabase-server";

export default async function Home() {
  const supabase =
    createServerClient();

  const { data: properties } =
    await supabase
      .from("properties")
      .select("*");

  return (
    <main className="overflow-hidden">
      <Navbar />

      <Hero />

      <FeaturedProperties
        properties={properties || []}
      />

      <Categories />

      <About />

      <CTA />

      <Footer />
    </main>
  );
}