const categories = [
  "Casas",
  "Condomínios",
  "Terrenos",
  "Na Planta",
  "Aluguel",
];

export function Categories() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14">
          <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-sm">
            Categorias
          </span>

          <h2 className="text-5xl font-bold mt-4">
            Descubra oportunidades exclusivas.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {categories.map((category) => (
            <div
              key={category}
              className="group rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-10 cursor-pointer transition hover:border-[#72A3BF]/40 hover:-translate-y-2"
            >
              <div className="h-16 w-16 rounded-2xl bg-[#72A3BF]/10 border border-[#72A3BF]/20 mb-8" />

              <h3 className="text-2xl font-semibold">
                {category}
              </h3>

              <p className="text-white/50 mt-4">
                Imóveis sofisticados selecionados com exclusividade.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}