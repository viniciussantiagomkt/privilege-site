"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

interface PropertyViewTrackerProps {
  propertyId: number;
}

export function PropertyViewTracker({
  propertyId,
}: PropertyViewTrackerProps) {
  useEffect(() => {
    trackEvent("view_property", {
      property_id: propertyId,
    });

    void supabase.rpc("increment_property_view", {
      target_property_id: propertyId,
      source_value: document.referrer || "direct",
      page_path_value: window.location.pathname,
    });
  }, [propertyId]);

  return null;
}
