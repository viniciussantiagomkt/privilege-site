import type { MetadataRoute } from "next";

import { createServerClient } from "@/lib/supabase-server";
import { propertyCategories } from "@/lib/property-filters";
import { Property } from "@/types/property";

const siteUrl = "https://privilegeimoveis.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("properties")
    .select("slug,updated_at,created_at,city_slug,status")
    .in("status", ["ativo", "reservado", "vendido", "alugado"])
    .order("created_at", { ascending: false });

  const properties = (data || []) as Pick<
    Property,
    "slug" | "updated_at" | "created_at" | "city_slug" | "status"
  >[];

  const cities = Array.from(
    new Set(properties.map((property) => property.city_slug).filter(Boolean))
  ) as string[];

  return [
    "",
    "/imoveis",
    "/sobre",
    "/contato",
    "/corretores",
    ...propertyCategories
      .filter((category) => category.value)
      .map((category) => `/imoveis/categoria/${category.value}`),
    ...cities.map((city) => `/imoveis/cidade/${city}`),
    ...properties.map((property) => `/imoveis/${property.slug}`),
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified:
      properties.find((property) => path.endsWith(property.slug))?.updated_at ??
      new Date(),
    changeFrequency: path.startsWith("/imoveis/") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/imoveis" ? 0.9 : 0.7,
  }));
}
