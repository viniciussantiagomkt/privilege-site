import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Hammer,
  Home,
  KeyRound,
  Map,
  Trees,
} from "lucide-react";

const categories = [
  {
    title: "Casas",
    slug: "casas",
    icon: Home,
  },
  {
    title: "Condomínios",
    slug: "condominios",
    icon: Trees,
  },
  {
    title: "Terrenos",
    slug: "terrenos",
    icon: Map,
  },
  {
    title: "Na planta",
    slug: "na-planta",
    icon: Hammer,
  },
  {
    title: "Aluguel",
    slug: "aluguel",
    icon: KeyRound,
  },
  {
    title: "Apartamentos",
    slug: "apartamentos",
    icon: Building2,
  },
  {
    title: "Minha Casa Minha Vida",
    slug: "minha-casa-minha-vida",
    icon: BadgeCheck,
  },
];

export function Categories() {
  return (
    <section className="py-16 text-[#030F18] md:py-24">
      <div className="premium-shell">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
              Categorias
            </span>

            <h2 className="mt-4 text-[clamp(2.25rem,10vw,4.6rem)] font-semibold leading-[0.98] text-[#1D4052] md:leading-[0.95]">
              Escolha o perfil do imóvel.
            </h2>
          </div>

          <p className="max-w-md text-sm leading-6 text-[#030F18]/54 md:text-right">
            Navegação rápida por categorias, integrada ao catálogo e aos filtros
            da plataforma.
          </p>
        </div>

        <nav
          aria-label="Categorias de imóveis"
          className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/46 p-2 shadow-[0_18px_64px_rgba(3,15,24,0.045)] backdrop-blur-xl"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
            {categories.map((category) => {
              const Icon = category.icon;
              const isLongCategory = category.slug === "minha-casa-minha-vida";

              return (
                <Link
                  key={category.slug}
                  href={`/imoveis/categoria/${category.slug}`}
                  className={`group flex min-h-24 items-center gap-3 rounded-[22px] border border-transparent bg-[#E0E8E6]/56 px-3 py-4 text-left transition duration-500 hover:-translate-y-0.5 hover:border-[#446E87]/24 hover:bg-[#E0E8E6] sm:flex-col sm:justify-center sm:text-center md:min-h-32 md:px-4 md:py-5 ${
                    isLongCategory ? "col-span-2 sm:col-span-1" : ""
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#446E87]/14 bg-[#D7E1DF]/68 text-[#1D4052] transition duration-500 group-hover:border-[#1D4052]/24 group-hover:bg-[#1D4052] group-hover:text-[#E0E8E6] md:h-12 md:w-12">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <span className="text-sm font-medium leading-tight text-[#1D4052] md:text-center">
                    {category.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </section>
  );
}
