"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

interface PropertyViewTrackerProps {
  propertyId: number;
  propertySlug: string;
  propertyTitle: string;
  propertyType?: string | null;
  propertyCategory?: string | null;
  propertyPrice?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  bedrooms?: number | null;
  parkingSpaces?: number | null;
  area?: string | null;
  brokerId?: string | null;
  brokerName?: string | null;
}

export function PropertyViewTracker({
  propertyId,
  propertySlug,
  propertyTitle,
  propertyType,
  propertyCategory,
  propertyPrice,
  city,
  neighborhood,
  bedrooms,
  parkingSpaces,
  area,
  brokerId,
  brokerName,
}: PropertyViewTrackerProps) {
  useEffect(() => {
    trackEvent("property_view", {
      property_id: propertyId,
      property_slug: propertySlug,
      property_title: propertyTitle,
      property_type: propertyType || null,
      property_category: propertyCategory || null,
      property_price: propertyPrice ?? null,
      city: city || null,
      neighborhood: neighborhood || null,
      bedrooms: bedrooms ?? null,
      parking_spaces: parkingSpaces ?? null,
      area: area || null,
      broker_id: brokerId || null,
      broker_name: brokerName || null,
    });

    void supabase.rpc("increment_property_view", {
      target_property_id: propertyId,
      source_value: document.referrer || "direct",
      page_path_value: window.location.pathname,
    });
  }, [
    area,
    bedrooms,
    brokerId,
    brokerName,
    city,
    neighborhood,
    parkingSpaces,
    propertyCategory,
    propertyId,
    propertyPrice,
    propertySlug,
    propertyTitle,
    propertyType,
  ]);

  return null;
}
