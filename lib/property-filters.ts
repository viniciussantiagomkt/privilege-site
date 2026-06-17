import { Property } from "@/types/property";

export const propertyCategories = [
  { label: "Todos", value: "" },
  { label: "Casas", value: "casas" },
  { label: "Condomínios", value: "condominios" },
  { label: "Terrenos", value: "terrenos" },
  { label: "Na planta", value: "na-planta" },
  { label: "Aluguel", value: "aluguel" },
  { label: "Apartamentos", value: "apartamentos" },
  { label: "Minha Casa Minha Vida", value: "minha-casa-minha-vida" },
];

export const priceRanges = [
  { label: "Qualquer valor", value: "" },
  { label: "Até R$ 200 mil", value: "200mil", max: 200000 },
  { label: "Até R$ 500 mil", value: "500mil", max: 500000 },
  { label: "Até R$ 2 milhões", value: "2milhoes", max: 2000000 },
  { label: "Acima de R$ 2 milhões", value: "acima-2milhoes", min: 2000000 },
];

export const publicPropertyStatuses = ["ativo", "reservado", "vendido", "alugado"];

export const propertyStatuses = [
  { label: "Todos os status", value: "" },
  { label: "Ativo", value: "ativo" },
  { label: "Reservado", value: "reservado" },
  { label: "Vendido", value: "vendido" },
  { label: "Alugado", value: "alugado" },
  { label: "Rascunho", value: "rascunho" },
];

export const sortOptions = [
  { label: "Mais recentes", value: "recentes" },
  { label: "Maior valor", value: "maior-valor" },
  { label: "Menor valor", value: "menor-valor" },
  { label: "Mais vistos", value: "mais-vistos" },
  { label: "Destaque", value: "destaque" },
];

export function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugToCategoryLabel(slug: string) {
  return (
    propertyCategories.find((category) => category.value === slug)?.label ??
    slug.replace(/-/g, " ")
  );
}

export function slugify(value = "") {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getPropertyNumericPrice(price: string) {
  const normalized = normalizeText(price);

  if (!normalized || normalized.includes("consulta")) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return Number(digits);
}

export function matchesCategory(property: Property, category: string) {
  if (!category) {
    return true;
  }

  const normalizedCategory = normalizeText(category);
  const propertyCategory = normalizeText(property.category);
  const propertyTitle = normalizeText(property.title);

  const aliases: Record<string, string[]> = {
    casas: ["casa", "casas"],
    condominios: ["condominio", "condominios", "casa em condominio"],
    terrenos: ["terreno", "terrenos"],
    "na-planta": ["na planta", "lancamento", "lancamentos"],
    aluguel: ["aluguel", "locacao"],
    apartamentos: ["apartamento", "apartamentos"],
  };

  if (normalizedCategory === "minha-casa-minha-vida") {
    return Boolean(property.minha_casa_minha_vida);
  }

  const terms = aliases[normalizedCategory] ?? [normalizedCategory];

  return terms.some(
    (term) => propertyCategory.includes(term) || propertyTitle.includes(term)
  );
}

export function matchesPrice(property: Property, priceRange: string) {
  if (!priceRange) {
    return true;
  }

  const range = priceRanges.find((item) => item.value === priceRange);

  if (!range) {
    return true;
  }

  const price = getPropertyNumericPrice(property.price);

  if (price === null) {
    return true;
  }

  if (range.min) {
    return price >= range.min;
  }

  if (range.max) {
    return price <= range.max;
  }

  return true;
}

export function filterProperties(
  properties: Property[],
  filters: {
    busca?: string;
    categoria?: string;
    cidade?: string;
    bairro?: string;
    status?: string;
    preco?: string;
    quartos?: string;
    tipo?: string;
    ordenar?: string;
  }
) {
  const search = normalizeText(filters.busca);

  const filtered = properties.filter((property) => {
    const searchableText = normalizeText(
      [
        property.title,
        property.location,
        property.city,
        property.neighborhood,
        property.category,
        property.type,
        property.status,
        property.description,
        property.minha_casa_minha_vida ? "minha casa minha vida primeiro imovel financiamento" : "",
      ].join(" ")
    );

    const matchesSearch = !search || searchableText.includes(search);
    const matchesCity =
      !filters.cidade ||
      normalizeText(property.city_slug || property.city || "").includes(
        normalizeText(filters.cidade)
      );
    const matchesNeighborhood =
      !filters.bairro ||
      normalizeText(property.neighborhood_slug || property.neighborhood || "").includes(
        normalizeText(filters.bairro)
      );
    const matchesStatus =
      !filters.status ||
      normalizeText(property.status || "ativo") === normalizeText(filters.status);
    const matchesBedrooms =
      !filters.quartos ||
      Number(property.bedrooms ?? 0) >= Number(filters.quartos);
    const matchesType =
      !filters.tipo ||
      normalizeText(property.category).includes(normalizeText(filters.tipo));

    return (
      matchesSearch &&
      matchesCity &&
      matchesNeighborhood &&
      matchesStatus &&
      matchesCategory(property, filters.categoria ?? "") &&
      matchesPrice(property, filters.preco ?? "") &&
      matchesBedrooms &&
      matchesType
    );
  });

  return filtered.sort((a, b) => {
    switch (filters.ordenar) {
      case "maior-valor":
        return (
          (getPropertyNumericPrice(b.price) ?? 0) -
          (getPropertyNumericPrice(a.price) ?? 0)
        );
      case "menor-valor":
        return (
          (getPropertyNumericPrice(a.price) ?? Number.MAX_SAFE_INTEGER) -
          (getPropertyNumericPrice(b.price) ?? Number.MAX_SAFE_INTEGER)
        );
      case "mais-vistos":
        return Number(b.view_count ?? 0) - Number(a.view_count ?? 0);
      case "destaque":
        return Number(b.featured) - Number(a.featured);
      default:
        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
    }
  });
}
