import type { MetadataRoute } from "next";

import { createServerClient } from "@/lib/supabase-server";
import { propertyCategories } from "@/lib/property-filters";
import { absoluteUrl } from "@/lib/site";
import { Property } from "@/types/property";

type SitemapEntry = MetadataRoute.Sitemap[number];

function sitemapEntry(
  path: string,
  options: Omit<SitemapEntry, "url"> = {}
): SitemapEntry {
  return {
    url: absoluteUrl(path),
    ...options,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("properties")
    .select("slug,updated_at,created_at,city_slug,status")
    .in("status", ["ativo", "reservado", "vendido", "alugado"])
    .not("slug", "is", null)
    .order("created_at", { ascending: false });

  const properties = ((data || []) as Pick<
    Property,
    "slug" | "updated_at" | "created_at" | "city_slug" | "status"
  >[]).filter((property) => property.slug);

  const cities = Array.from(
    new Set(properties.map((property) => property.city_slug).filter(Boolean))
  ) as string[];

  const entries: SitemapEntry[] = [
    sitemapEntry("/", {
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    }),
    sitemapEntry("/imoveis", {
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    }),
    sitemapEntry("/sobre", {
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.65,
    }),
    sitemapEntry("/contato", {
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    }),
    sitemapEntry("/corretores", {
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    }),
    ...propertyCategories
      .filter((category) => category.value)
      .map((category) =>
        sitemapEntry(`/imoveis/categoria/${category.value}`, {
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        })
      ),
    ...cities.map((city) =>
      sitemapEntry(`/imoveis/cidade/${city}`, {
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.82,
      })
    ),
    ...properties.map((property) =>
      sitemapEntry(`/imoveis/${property.slug}`, {
        lastModified: property.updated_at || property.created_at || new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      })
    ),
  ];

  return Array.from(
    new Map(entries.map((entry) => [entry.url, entry])).values()
  );
}
