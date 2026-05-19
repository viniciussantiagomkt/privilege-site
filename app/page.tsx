import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { Hero } from "@/sections/Hero";
import { FeaturedProperties } from "@/sections/FeaturedProperties";
import { Categories } from "@/sections/Categories";
import { About } from "@/sections/about";
import { CTA } from "@/sections/cta";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <Navbar />

      <Hero />

      <FeaturedProperties />

      <Categories />

      <About />

      <CTA />

      <Footer />
    </main>
  );
}