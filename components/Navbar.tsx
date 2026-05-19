"use client";

import { useState } from "react";

import { Menu, X } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-6 py-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl">
          <h2 className="text-xl font-bold tracking-wide">
            Privilege Imoveis
          </h2>

          <nav className="hidden lg:flex items-center gap-10 text-sm text-white/70">
            <a href="/">Home</a>

            <a href="/imoveis">Imóveis</a>

            <a href="#">Categorias</a>

            <a href="#">Contato</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden md:flex px-5 py-3 rounded-full bg-[#72A3BF] text-black font-semibold">
              Agendar visita
            </button>

            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4 rounded-[32px] border border-white/10 bg-[#030F18]/95 backdrop-blur-2xl p-8 flex flex-col gap-6">
            <a href="/">Home</a>

            <a href="/imoveis">Imóveis</a>

            <a href="#">Categorias</a>

            <a href="#">Contato</a>
          </div>
        )}
      </div>
    </header>
  );
}