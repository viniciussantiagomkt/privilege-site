"use client";

import Image from "next/image";
import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PropertyCard } from "@/components/PropertyCard";
import {
  filterProperties,
  priceRanges,
  propertyCategories,
  propertyStatuses,
  sortOptions,
} from "@/lib/property-filters";
import { trackEvent } from "@/lib/analytics";
import { Property } from "@/types/property";

interface PropertyCatalogProps {
  properties: Property[];
}

type FilterName =
  | "busca"
  | "categoria"
  | "cidade"
  | "bairro"
  | "status"
  | "preco"
  | "quartos"
  | "tipo"
  | "ordenar";

export function PropertyCatalog({ properties }: PropertyCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    [properties, busca, categoria, cidade, bairro, status, preco, quartos, tipo, ordenar]
  );

  const activeFilters = useMemo(
    () =>
      [
        { name: "busca" as const, label: busca },
        {
          name: "categoria" as const,
          label: propertyCategories.find((item) => item.value === categoria)?.label,
        },
        { name: "cidade" as const, label: cidade },
        { name: "bairro" as const, label: bairro },
        {
          name: "status" as const,
          label: propertyStatuses.find((item) => item.value === status)?.label,
        },
        {
          name: "preco" as const,
          label: priceRanges.find((item) => item.value === preco)?.label,
        },
        { name: "quartos" as const, label: quartos ? `${quartos}+ quartos` : "" },
        {
          name: "ordenar" as const,
          label: ordenar !== "recentes" ? sortOptions.find((item) => item.value === ordenar)?.label : "",
        },
      ].filter((item) => item.label),
    [busca, categoria, cidade, bairro, status, preco, quartos, ordenar]
  );

  function pushWithParams(params: URLSearchParams) {
    const query = params.toString();

    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function updateFilter(name: FilterName, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    const selectedPriceRange = priceRanges.find(
      (item) => item.value === params.get("preco")
    );

    trackEvent("property_search", {
      search_type: name,
      search_term: params.get("busca") || null,
      category: params.get("categoria") || null,
      city: params.get("cidade") || null,
      neighborhood: params.get("bairro") || null,
      min_price: selectedPriceRange?.min ?? null,
      max_price: selectedPriceRange?.max ?? null,
      bedrooms: params.get("quartos") || null,
      property_status: params.get("status") || null,
      sort_order: params.get("ordenar") || "recentes",
    });

    pushWithParams(params);
  }

  function clearFilter(name: FilterName) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(name);
    pushWithParams(params);
  }

  function clearFilters() {
    startTransition(() => router.push(pathname));
  }

  const fieldClass =
    "h-14 min-w-0 rounded-2xl border border-[#446E87]/16 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none transition duration-500 placeholder:text-[#030F18]/35 focus:border-[#446E87]/42 focus:bg-[#E0E8E6]";

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-[26px] border border-[#446E87]/16 bg-[#D7E1DF]/70 p-3 shadow-[0_24px_80px_rgba(3,15,24,0.05)] backdrop-blur-xl md:mb-10 md:rounded-[30px]">
        {isPending && <div className="mb-3 h-px w-full animate-pulse rounded-full bg-[#72A3BF]/70" />}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-8">
          <input
            type="text"
            placeholder="Nome, localização, bairro ou condomínio"
            value={busca}
            onChange={(event) => updateFilter("busca", event.target.value)}
            className={`${fieldClass} sm:col-span-2 xl:col-span-2`}
          />

          <select value={categoria} onChange={(event) => updateFilter("categoria", event.target.value)} className={fieldClass}>
            {propertyCategories.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select value={cidade} onChange={(event) => updateFilter("cidade", event.target.value)} className={fieldClass}>
            <option value="">Cidade</option>
            {cityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select value={bairro} onChange={(event) => updateFilter("bairro", event.target.value)} className={fieldClass}>
            <option value="">Bairro</option>
            {neighborhoodOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select value={preco} onChange={(event) => updateFilter("preco", event.target.value)} className={fieldClass}>
            {priceRanges.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select value={status} onChange={(event) => updateFilter("status", event.target.value)} className={fieldClass}>
            {propertyStatuses.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select value={quartos} onChange={(event) => updateFilter("quartos", event.target.value)} className={fieldClass}>
            <option value="">Quartos</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>

          <select value={ordenar} onChange={(event) => updateFilter("ordenar", event.target.value)} className={fieldClass}>
            {sortOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button onClick={clearFilters} className="premium-ghost h-14 px-5 sm:col-span-2 xl:col-span-1">
            Limpar filtros
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeFilters.map((item) => (
              <button
                key={item.name}
                onClick={() => clearFilter(item.name)}
                className="rounded-full border border-[#1D4052]/14 bg-[#E0E8E6]/58 px-3 py-2 text-xs text-[#1D4052] transition duration-500 hover:border-[#1D4052]/36 hover:bg-[#E0E8E6]"
              >
                {item.label} ×
              </button>
            ))}
          </div>
        )}
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
              <PropertyCard key={property.id} property={property} />
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
            <h2 className="text-3xl font-bold">Nenhum imóvel encontrado</h2>

            <p className="mt-4 max-w-xl text-[#030F18]/56">
              Ajuste os filtros ou fale com a equipe para encontrar uma oportunidade exclusiva fora da vitrine pública.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
