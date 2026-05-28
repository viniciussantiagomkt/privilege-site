import Image from "next/image";
import Link from "next/link";

import { companyEmail, companyPhoneDisplay } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/imoveis", label: "Imóveis" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function Footer() {
  return (
    <footer data-nav-theme="dark" className="bg-[#030F18] px-4 pb-6 pt-14 text-[#E0E8E6] md:pb-8 md:pt-20">
      <div className="premium-shell rounded-[30px] border border-[#E0E8E6]/10 bg-[#E0E8E6]/[0.035] p-6 shadow-[0_-8px_80px_rgba(224,232,230,0.03)] md:rounded-[40px] md:p-10">
        <div className="grid gap-9 lg:grid-cols-[1fr_1fr_1fr] lg:gap-10">
          <div>
            <Image
              src="/brand/logo-horizontal-light.png"
              alt="Privilege Imóveis"
              width={256}
              height={56}
              className="h-12 w-56 object-contain object-left md:h-14 md:w-64"
            />

            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#E0E8E6] md:text-4xl">
              Onde o privilégio tem endereço.
            </h2>

            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[#E0E8E6]/48">
              CRECI: 839J
            </p>
          </div>

          <div>
            <span className="text-sm text-[#E0E8E6]/40">Páginas</span>
            <div className="mt-4 grid gap-3">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="text-[#E0E8E6]/62 transition duration-500 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm text-[#E0E8E6]/40">Contato</span>
            <div className="mt-4 grid gap-3 text-[#E0E8E6]/62">
              <span>Campina Grande, PB</span>
              <span>{companyEmail}</span>
              <span>{companyPhoneDisplay}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[#E0E8E6]/10 pt-6 text-sm text-[#E0E8E6]/38 md:flex-row md:items-center md:justify-between">
          <span>Privilege Imóveis</span>
          <span>Premium real estate platform</span>
        </div>
      </div>
    </footer>
  );
}
