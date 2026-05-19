export function Footer() {
  return (
    <footer className="border-t border-white/10 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-10">
        <div>
          <h2 className="text-3xl font-bold">
            Privilege Imoveis
          </h2>

          <p className="text-white/50 mt-4 max-w-md">
            Onde o privilégio tem endereço.
          </p>
        </div>

        <div className="flex items-center gap-8 text-white/60">
          <a href="#" className="hover:text-white transition">
            Home
          </a>

          <a href="#" className="hover:text-white transition">
            Imóveis
          </a>

          <a href="#" className="hover:text-white transition">
            Contato
          </a>
        </div>
      </div>
    </footer>
  );
}