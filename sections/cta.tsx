export function CTA() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-[#1D4052] to-[#030F18] p-16 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#72A3BF]/20 blur-[180px]" />

          <div className="relative z-10">
            <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-sm">
              Exclusividade
            </span>

            <h2 className="text-5xl font-bold mt-6 max-w-4xl mx-auto leading-tight">
              O próximo patrimônio extraordinário pode estar a um clique.
            </h2>

            <p className="text-white/60 mt-8 max-w-2xl mx-auto text-lg">
              Converse com nossos especialistas e descubra imóveis selecionados
              para elevar seu estilo de vida.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-5 mt-12">
              <button className="px-8 py-4 rounded-full bg-[#72A3BF] text-black font-semibold transition hover:scale-105">
                Falar com especialista
              </button>

              <button className="px-8 py-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition">
                Explorar imóveis
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}