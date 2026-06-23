import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    title: "Casas",
    slug: "casas",
    image: "/categories/casas.webp",
  },
  {
    title: "Condomínios",
    slug: "condominios",
    image: "/categories/condominios.webp",
  },
  {
    title: "Terrenos",
    slug: "terrenos",
    image: "/categories/terrenos.webp",
  },
  {
    title: "Na planta",
    slug: "na-planta",
    image: "/categories/na-planta.webp",
  },
  {
    title: "Aluguel",
    slug: "aluguel",
    image: "/categories/aluguel.webp",
  },
  {
    title: "Apartamentos",
    slug: "apartamentos",
    image: "/categories/apartamentos.webp",
  },
  {
    title: "Minha Casa Minha Vida",
    slug: "minha-casa-minha-vida",
    image: "/categories/minha-casa-minha-vida.webp",
  },
];

export function Categories() {
  return (
    <section className="py-20 text-[#030F18] md:py-28">
      <div className="premium-shell">
        <div className="mb-10 md:mb-14">
          <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
            Categorias
          </span>

          <h2 className="mt-5 text-[clamp(2.6rem,13vw,6rem)] font-semibold leading-[0.96] text-[#1D4052] md:leading-[0.95]">
            Explore por estilo.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/imoveis/categoria/${category.slug}`}
              className="group relative min-h-[300px] overflow-hidden rounded-[28px] border border-[#446E87]/14 bg-[#E0E8E6]/58 p-2 shadow-[0_24px_80px_rgba(3,15,24,0.06)] transition duration-700 hover:-translate-y-1 hover:shadow-[0_34px_100px_rgba(3,15,24,0.1)] md:min-h-[360px] md:rounded-[34px]"
            >
              <div className="relative h-full min-h-[284px] overflow-hidden rounded-[24px] md:min-h-[344px] md:rounded-[28px]">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
                />

                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-[#030F18]/12 to-[#030F18]/80" />

                <div className="absolute bottom-5 left-5 right-5 md:bottom-6 md:left-6 md:right-6">
                  <h3
                    className="text-3xl font-semibold md:text-4xl"
                    style={{
                      color: "#E0E8E6",
                      textShadow: "0 8px 28px rgba(3,15,24,0.42)",
                    }}
                  >
                    {category.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
