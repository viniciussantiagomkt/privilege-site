"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { FormEvent, useState } from "react";

import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";

import {
  priceRanges,
  propertyCategories,
} from "@/lib/property-filters";

export function Hero() {
  const router = useRouter();
  const [category, setCategory] = useState("casas");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("500mil");

  const { scrollY } = useScroll();

  const imageY = useTransform(scrollY, [0, 700], [0, 70]);
  const imageScale = useTransform(scrollY, [0, 700], [1.02, 1.08]);
  const titleY = useTransform(scrollY, [0, 450], [0, -26]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (category) params.set("categoria", category);
    if (price) params.set("preco", price);
    if (city.trim()) params.set("cidade", city.trim());

    router.push(`/imoveis?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden bg-[#E0E8E6] px-4 pb-14 pt-28 text-[#030F18] md:pb-20 md:pt-32">
      <motion.div
        style={{ y: imageY, scale: imageScale }}
        className="absolute inset-x-0 top-0 h-[calc(100%-3rem)] origin-center"
      >
        <Image
          src="/hero/campina-grande-skyline.jpg"
          alt="Vista urbana premium de Campina Grande"
          fill
          priority
          sizes="100vw"
          className="h-full w-full object-cover object-[62%_50%] sm:object-[58%_50%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(224,232,230,0.98)_0%,rgba(224,232,230,0.88)_42%,rgba(224,232,230,0.48)_72%,rgba(3,15,24,0.16)_100%)] md:bg-[linear-gradient(105deg,rgba(224,232,230,0.96)_0%,rgba(224,232,230,0.86)_26%,rgba(224,232,230,0.42)_52%,rgba(3,15,24,0.18)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_36%,rgba(114,163,191,0.12),transparent_24rem),linear-gradient(180deg,rgba(3,15,24,0.06)_0%,rgba(224,232,230,0.10)_64%,#E0E8E6_100%)]" />
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent via-[#E0E8E6]/72 to-[#E0E8E6]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(68,110,135,0.12),transparent_30rem)]" />
      <Image
        src="/brand/symbol-blue.png"
        alt=""
        aria-hidden="true"
        width={896}
        height={576}
        className="pointer-events-none absolute -right-32 top-28 w-[30rem] max-w-none opacity-[0.025] mix-blend-multiply md:-right-32 md:w-[56rem]"
      />

      <div className="premium-shell relative">
        <div className="grid min-h-[min(680px,calc(100svh-6rem))] grid-cols-1 items-center gap-10 md:min-h-[calc(100vh-9rem)] lg:grid-cols-[0.76fr_1.24fr]">
          <motion.div
            style={{ y: titleY }}
            className="relative z-10 max-w-3xl pt-8 sm:pt-10 lg:pt-0"
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="text-[0.68rem] uppercase tracking-[0.32em] text-[#446E87] sm:text-xs sm:tracking-[0.42em]"
            />
            <motion.h1
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-3xl text-[clamp(3.05rem,16vw,7.8rem)] font-semibold leading-[0.9] tracking-normal text-[#1D4052] sm:mt-7 sm:text-[clamp(4rem,8.2vw,7.8rem)] sm:leading-[0.88]"
            >
              Onde o privilégio tem endereço.
            </motion.h1>

            <p className="mt-6 max-w-md text-base leading-7 text-[#030F18]/62 sm:mt-8 sm:max-w-xl sm:text-lg sm:leading-8">
              Uma curadoria imobiliária feita para quem busca escolher melhor,
              viver bem e investir com confiança.
            </p>
          </motion.div>
          <div className="hidden lg:block" />
        </div>

        <div className="relative z-10 mt-0 md:mt-2">
          <form
            onSubmit={handleSearch}
            className="grid gap-2 rounded-[26px] border border-[#446E87]/16 bg-[#D7E1DF]/78 p-2 shadow-[0_24px_80px_rgba(3,15,24,0.08)] backdrop-blur-2xl md:grid-cols-[1fr_1fr_1fr_150px] md:rounded-[30px]"
          >
            <div className="rounded-2xl bg-[#E0E8E6]/72 px-4 py-3">
              <label className="text-xs text-[#030F18]/42">Categoria</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 w-full bg-transparent text-[#030F18] outline-none"
              >
                {propertyCategories
                  .filter((item) => item.value)
                  .map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="rounded-2xl bg-[#E0E8E6]/72 px-4 py-3">
              <label className="text-xs text-[#030F18]/42">Cidade</label>
              <input
                type="text"
                placeholder="Campina Grande"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1 w-full bg-transparent text-[#030F18] outline-none placeholder:text-[#030F18]/32"
              />
            </div>

            <div className="rounded-2xl bg-[#E0E8E6]/72 px-4 py-3">
              <label className="text-xs text-[#030F18]/42">Faixa de valor</label>
              <select
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-1 w-full bg-transparent text-[#030F18] outline-none"
              >
                {priceRanges
                  .filter((item) => item.value)
                  .map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </div>

            <button className="min-h-14 rounded-2xl border border-[#1D4052] bg-[#1D4052] px-6 text-[#E0E8E6] shadow-[0_18px_50px_rgba(29,64,82,0.16)] transition duration-500 hover:border-[#446E87] hover:bg-[#446E87] md:rounded-full">
              Buscar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
