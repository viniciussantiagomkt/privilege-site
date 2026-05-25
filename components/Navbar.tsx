"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/imoveis", label: "Imoveis" },
  { href: "/sobre", label: "Sobre" },
  { href: "/corretores", label: "Corretores" },
  { href: "/contato", label: "Contato" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [darkSurface, setDarkSurface] = useState(false);

  useEffect(() => {
    function detectSurface() {
      const target = document
        .elementsFromPoint(window.innerWidth / 2, 40)
        .find((element) => !element.closest("header"))
        ?.closest("[data-nav-theme='dark']");

      setDarkSurface(Boolean(target));
    }
console.log(
  "GA4:",
  process.env.NEXT_PUBLIC_GA4_ID
);
    detectSurface();
    window.addEventListener("scroll", detectSurface, { passive: true });
    window.addEventListener("resize", detectSurface);

    return () => {
      window.removeEventListener("scroll", detectSurface);
      window.removeEventListener("resize", detectSurface);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed left-0 top-0 z-50 w-full px-3 py-3 text-[#030F18] md:px-4 md:py-5">
      <div className="premium-shell pointer-events-auto flex items-center justify-center gap-3">
        <Link
          href="/"
          className="premium-pill hidden h-14 items-center justify-center rounded-full px-5 transition hover:scale-[1.015] md:flex"
          aria-label="Privilege Imoveis"
        >
          <img
            src={darkSurface ? "/brand/logo-horizontal-light.png" : "/brand/logo-horizontal-blue.png"}
            alt="Privilege Imoveis"
            className="h-9 w-44 object-contain object-left"
          />
        </Link>

        <div className="premium-pill flex min-h-14 flex-1 items-center justify-between rounded-full px-3 md:flex-none md:px-5">
          <Link
            href="/"
            className="mr-6 flex items-center md:hidden"
            aria-label="Privilege Imoveis"
          >
            <img
              src={darkSurface ? "/brand/logo-horizontal-light.png" : "/brand/logo-horizontal-blue.png"}
              alt="Privilege Imoveis"
              className="h-8 w-28 object-contain object-left sm:w-32"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
              className="premium-nav-link text-sm"
            >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setOpen((current) => !current)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-[#030F18]/70 transition hover:bg-white/35 lg:hidden"
            aria-label="Abrir menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>

        <Link
          href="/contato"
          className="premium-cta hidden px-6 text-sm md:inline-flex"
        >
          Atendimento Privilege
        </Link>
      </div>

      {open && (
        <div className="premium-shell pointer-events-auto mt-3 rounded-[28px] border border-[#446E87]/18 bg-[#E0E8E6]/95 p-4 text-[#030F18] shadow-[0_24px_80px_rgba(3,15,24,0.12)] backdrop-blur-2xl lg:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-4 text-[#030F18]/78 transition hover:bg-white/40"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contato"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-12 items-center justify-center rounded-full border border-[#1D4052] bg-[#1D4052] px-5 text-sm text-[#E0E8E6] transition hover:bg-[#446E87]"
            >
              Atendimento Privilege
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
