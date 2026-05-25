export interface Property {
  id: number;
  created_at?: string;
  updated_at?: string;
  slug: string;

  title: string;
  description: string;

  location: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  city_slug?: string | null;
  neighborhood?: string | null;
  neighborhood_slug?: string | null;
  category: string;
  type?: string | null;
  status?: "ativo" | "reservado" | "vendido" | "alugado" | "rascunho" | "inativo" | string;

  price: string;
  condominium?: string | null;
  iptu?: string | null;

  bedrooms: number | null;
  bathrooms: number | null;
  garage: number | null;
  area: string | null;

  featured: boolean;
  view_count?: number | null;

  images: string[];
  main_image_url?: string | null;
  videos?: string[];
  video_url?: string | null;
  virtual_tour_url?: string | null;

  broker_id?: string | null;
  broker?: Broker | null;

  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[];
  og_image?: string | null;
  whatsapp?: string | null;
  external_url?: string | null;
}

export interface Broker {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  avatar_url?: string | null;
  creci?: string | null;
  instagram?: string | null;
  position?: string | null;
  role_title?: string | null;
  bio?: string | null;
  active?: boolean;
}

export interface PropertyImage {
  id?: number;
  property_id?: number;
  url: string;
  storage_path?: string | null;
  alt?: string | null;
  sort_order?: number;
  is_main?: boolean;
}

export interface PropertyVideo {
  id?: number;
  property_id?: number;
  url: string;
  storage_path?: string | null;
  title?: string | null;
  provider?: string | null;
  sort_order?: number;
}
