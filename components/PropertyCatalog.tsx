"use client";

import { useMemo } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PropertyCard } from "@/components/PropertyCard";
import {
  filterProperties,
  priceRanges,
  propertyCategories,
  propertyStatuses,
  sortOptions,
} from "@/lib/property-filters";
import { Property } from "@/types/property";

interface PropertyCatalogProps {
  properties: Property[];
}

export function PropertyCatalog({
  properties,
}: PropertyCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const busca = searchParams.get("busca") ?? "";
  const categoria = searchParams.get("categoria") ?? "";
  const cidade = searchParams.get("cidade") ?? "";
  const bairro = searchParams.get("bairro") ?? "";
  const status = searchParams.get("status") ?? "";
  const preco = searchParams.get("preco") ?? "";
  const quartos = searchParams.get("quartos") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const ordenar = searchParams.get("ordenar") ?? "recentes";

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Map(
          properties
            .filter((property) => property.city || property.city_slug)
            .map((property) => [
              property.city_slug || property.city || "",
              property.city || property.city_slug || "",
            ])
        ).entries()
      ),
    [properties]
  );

  const neighborhoodOptions = useMemo(
    () =>
      Array.from(
        new Map(
          properties
            .filter((property) => property.neighborhood || property.neighborhood_slug)
            .map((property) => [
              property.neighborhood_slug || property.neighborhood || "",
              property.neighborhood || property.neighborhood_slug || "",
            ])
        ).entries()
      ),
    [properties]
  );

  const filteredProperties = useMemo(
    () =>
      filterProperties(properties, {
        busca,
        categoria,
        cidade,
        bairro,
        status,
        preco,
        quartos,
        tipo,
        ordenar,
      }),
    [
      properties,
      busca,
      categoria,
      cidade,
      bairro,
      status,
      preco,
      quartos,
      tipo,
      ordenar,
    ]
  );

  function updateFilter(
    name: "busca" | "categoria" | "cidade" | "bairro" | "status" | "preco" | "quartos" | "tipo" | "ordenar",
    value: string
  ) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <div>
      <div className="mb-8 rounded-[26px] border border-[#446E87]/16 bg-[#D7E1DF]/70 p-3 shadow-[0_24px_80px_rgba(3,15,24,0.05)] backdrop-blur-xl md:mb-10 md:rounded-[30px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-8">
        <input
          type="text"
          placeholder="Nome, localização, bairro ou condomínio"
          value={busca}
          onChange={(event) => updateFilter("busca", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none placeholder:text-[#030F18]/35 sm:col-span-2 xl:col-span-2"
        />

        <select
          value={categoria}
          onChange={(event) => updateFilter("categoria", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          {propertyCategories.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={cidade}
          onChange={(event) => updateFilter("cidade", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          <option value="">Cidade</option>
          {cityOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={bairro}
          onChange={(event) => updateFilter("bairro", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          <option value="">Bairro</option>
          {neighborhoodOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={preco}
          onChange={(event) => updateFilter("preco", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          {priceRanges.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => updateFilter("status", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          {propertyStatuses.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={quartos}
          onChange={(event) => updateFilter("quartos", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          <option value="">Quartos</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>

        <select
          value={ordenar}
          onChange={(event) => updateFilter("ordenar", event.target.value)}
          className="h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none"
        >
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          onClick={clearFilters}
          className="premium-ghost h-14 px-5 sm:col-span-2 xl:col-span-1"
        >
          Limpar filtros
        </button>
      </div>
      </div>

      <section>
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[#030F18]/55">
            {filteredProperties.length} imóveis encontrados
          </p>
        </div>

      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-[34px] border border-[#446E87]/14 bg-[#D7E1DF]/50 px-6 text-center">
          <Image
            src="/brand/symbol-blue.png"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="mb-6 h-16 w-16 object-contain opacity-20"
          />
          <h2 className="text-3xl font-bold">
            Nenhum imóvel encontrado
          </h2>

          <p className="text-[#030F18]/56 mt-4 max-w-xl">
            Ajuste os filtros ou fale com a equipe para encontrar uma
            oportunidade exclusiva fora da vitrine pública. Ajuste sua busca
            ou fale com um especialista Privilege.
          </p>
        </div>
      )}
      </section>
    </div>
  );
}
