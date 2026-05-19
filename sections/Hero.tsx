export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=2070&auto=format&fit=crop')",
        }}
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute inset-0 bg-gradient-to-b from-[#030F18]/20 via-[#030F18]/40 to-[#030F18]" />

      <div className="relative z-10 px-6 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-[#72A3BF] mb-6">
          Privilege Imoveis
        </p>

        <h1 className="text-6xl md:text-8xl font-bold leading-tight max-w-6xl">
          Onde o privilégio
          <br />
          tem endereço.
        </h1>

        <p className="text-lg md:text-xl text-white/70 mt-8 max-w-3xl mx-auto leading-relaxed">
          Imóveis exclusivos, arquitetura sofisticada e experiências
          imobiliárias pensadas para quem exige excelência.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-5 mt-12">
          <button className="px-8 py-4 rounded-full bg-[#72A3BF] text-black font-semibold transition hover:scale-105 hover:shadow-2xl hover:shadow-[#72A3BF]/20">
            Explorar imóveis
          </button>

          <button className="px-8 py-4 rounded-full border border-white/15 bg-white/5 backdrop-blur-md transition hover:bg-white/10">
            Falar com especialista
          </button>
        </div>
      </div>
      <div className="mt-16 max-w-5xl mx-auto">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-5">
    <div className="text-left">
      <label className="text-sm text-white/50">
        Tipo
      </label>

      <select className="w-full mt-2 bg-transparent outline-none text-white">
        <option>Casa</option>
        <option>Apartamento</option>
        <option>Terreno</option>
      </select>
    </div>

    <div className="text-left">
      <label className="text-sm text-white/50">
        Localização
      </label>

      <input
        type="text"
        placeholder="Cidade ou bairro"
        className="w-full mt-2 bg-transparent outline-none placeholder:text-white/30"
      />
    </div>

    <div className="text-left">
      <label className="text-sm text-white/50">
        Faixa de valor
      </label>

      <select className="w-full mt-2 bg-transparent outline-none text-white">
        <option>Até R$ 500 mil</option>
        <option>Até R$ 1 milhão</option>
        <option>Alto padrão</option>
      </select>
    </div>

    <button className="rounded-2xl bg-[#72A3BF] text-black font-semibold hover:scale-[1.02] transition">
      Buscar imóvel
    </button>
  </div>
</div>
    </section>
  );
}