export function About() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-sm">
            Sobre a Privilege
          </span>

          <h2 className="text-5xl font-bold mt-6 leading-tight">
            Mais que imóveis.
            <br />
            Patrimônios extraordinários.
          </h2>

          <p className="text-white/60 mt-8 text-lg leading-relaxed">
            A Privilege Imoveis conecta pessoas a experiências imobiliárias
            sofisticadas, unindo arquitetura, localização e exclusividade em
            cada oportunidade apresentada.
          </p>

          <button className="mt-10 px-8 py-4 rounded-full bg-[#72A3BF] text-black font-semibold transition hover:scale-105">
            Conhecer a empresa
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-[#72A3BF]/10 blur-[120px]" />

          <img
            src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=2070&auto=format&fit=crop"
            alt="Luxury House"
            className="relative rounded-[40px] h-[700px] w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}