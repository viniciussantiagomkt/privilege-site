import { Property, PropertyImage } from "@/types/property";

// Stored first-party media links must not pin photos to a previous deployment.
// Keep the current environment's route, anonymous RLS and storage configuration.
export function normalizePropertyImageUrl(value: string): string {
  try {
    const url = new URL(value);
    const trustedHost = ["privilegeimoveispb.com.br", "www.privilegeimoveispb.com.br"].includes(url.hostname) ||
      /^privilege-site-[a-z0-9-]+-viniciussantiagomkts-projects\.vercel\.app$/.test(url.hostname);
    const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    if (url.protocol === "https:" && trustedHost && !url.username && !url.password && !url.port &&
      !url.search && !url.hash && new RegExp(`^/api/property-media/${uuid}/${uuid}\\.webp$`).test(url.pathname)) {
      return url.pathname;
    }
  } catch {
    // Relative paths and other existing image sources are left unchanged.
  }
  return value;
}

export function attachPropertyImages(
  properties: Property[],
  images: PropertyImage[] = []
) {
  const grouped = new Map<number, PropertyImage[]>();

  for (const image of images) {
    if (!image.property_id || !image.url) continue;
    grouped.set(image.property_id, [...(grouped.get(image.property_id) ?? []), image]);
  }

  return properties.map((property) => {
    const galleryMain = (grouped.get(property.id) ?? []).find((image) => image.is_main)?.url;
    const gallery = (grouped.get(property.id) ?? [])
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((image) => image.url)
      .filter(Boolean);
    const mergedImages = [
      property.main_image_url,
      ...gallery,
      ...(property.images ?? []),
    ].filter((image): image is string => Boolean(image))
      .map(normalizePropertyImageUrl)
      .filter((image, index, list) => list.indexOf(image) === index);

    return {
      ...property,
      images: mergedImages,
      main_image_url:
        (property.main_image_url ? normalizePropertyImageUrl(property.main_image_url) : null) ||
        (galleryMain ? normalizePropertyImageUrl(galleryMain) : null) ||
        mergedImages[0] ||
        null,
    };
  });
}
