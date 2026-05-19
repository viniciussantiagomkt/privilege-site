import { notFound } from "next/navigation";
import { ShareButton } from "@/components/ShareButton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { properties } from "@/data/properties";

interface PropertyPageProps {
  params: {
    slug: string;
  };
}
export async function generateMetadata({
  params,
}: PropertyPageProps) {
  const property = properties.find(
    (item) => item.slug === params.slug
  );

  if (!property) {
    return {};
  }

  return {
    title: property.title,
    description: property.description,
  };
}
export default function PropertyPage({
  params,
}: PropertyPageProps) {
  const property = properties.find(
    (item) => item.slug === params.slug
  );

  if (!property) {
    return notFound();
  }

  return (
    <main>
      <Navbar />

      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-[700px] object-cover rounded-[32px]"
            />

            <div className="grid grid-cols-2 gap-6">
              {property.images.slice(1).map((image) => (
                <img
                  key={image}
                  src={image}
                  alt={property.title}
                  className="w-full h-[340px] object-cover rounded-[28px]"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-20 mt-20">
            <div className="xl:col-span-2">
              <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-sm">
                {property.category}
              </span>

              <h1 className="text-6xl font-bold mt-6 leading-tight">
                {property.title}
              </h1>

              <p className="text-white/50 mt-6 text-lg">
                {property.location}
              </p>

              <p className="text-white/70 mt-10 text-lg leading-relaxed">
                {property.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-white/50 text-sm">
                    Quartos
                  </p>

                  <strong className="text-3xl mt-3 block">
                    {property.bedrooms}
                  </strong>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-white/50 text-sm">
                    Banheiros
                  </p>

                  <strong className="text-3xl mt-3 block">
                    {property.bathrooms}
                  </strong>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-white/50 text-sm">
                    Garagem
                  </p>

                  <strong className="text-3xl mt-3 block">
                    {property.garage}
                  </strong>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <p className="text-white/50 text-sm">
                    Área
                  </p>

                  <strong className="text-3xl mt-3 block">
                    {property.area}
                  </strong>
                </div>
              </div>
            </div>

            <div>
              <div className="sticky top-32 rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8">
                <p className="text-white/50">
                  Valor
                </p>

                <h2 className="text-5xl font-bold mt-4">
                  {property.price}
                </h2>

                <div className="flex flex-col gap-4 mt-10">
                  <a
  href={`https://wa.me/5583999999999?text=Olá! Tenho interesse no imóvel: ${property.title}`}
  target="_blank"
  className="w-full py-4 rounded-full bg-[#72A3BF] text-black font-semibold transition hover:scale-[1.02] flex items-center justify-center"
>
  Falar no WhatsApp
</a>

                  <ShareButton />
                  <ShareButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}