import { Property, PropertyImage } from "@/types/property";

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
    const gallery = (grouped.get(property.id) ?? [])
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((image) => image.url)
      .filter(Boolean);
    const mergedImages = [
      property.main_image_url,
      ...gallery,
      ...(property.images ?? []),
    ].filter((image, index, list): image is string => Boolean(image) && list.indexOf(image) === index);

    return {
      ...property,
      images: mergedImages,
      main_image_url:
        property.main_image_url ||
        (grouped.get(property.id) ?? []).find((image) => image.is_main)?.url ||
        mergedImages[0] ||
        null,
    };
  });
}
