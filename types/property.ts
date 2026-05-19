export interface Property {
  id: number;
  slug: string;

  title: string;
  description: string;

  location: string;
  category: string;

  price: string;

  bedrooms: number;
  bathrooms: number;
  garage: number;
  area: string;

  featured: boolean;

  images: string[];
}