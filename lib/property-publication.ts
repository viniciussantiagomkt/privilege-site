import type { SupabaseClient } from "@supabase/supabase-js";
import type { Property } from "@/types/property";
import { publicPropertyStatuses } from "@/lib/property-filters";

export function isPublicProperty(property: Property) {
  return property.publish_on_site === true && !property.deleted_at &&
    ["aprovado", "publicado"].includes(property.workflow_status || "") &&
    publicPropertyStatuses.includes(property.status || "");
}

type PublicColumns = "*" | "slug" | "slug,updated_at,created_at,city_slug,status";

// Keep literal selections for Supabase's type parser. Return a wrapper, not a thenable query.
export async function publicPropertyQuery(db: SupabaseClient, columns: PublicColumns = "*") {
  const selection = columns === "slug"
    ? db.from("properties").select("slug")
    : columns === "slug,updated_at,created_at,city_slug,status"
      ? db.from("properties").select("slug,updated_at,created_at,city_slug,status")
      : db.from("properties").select("*");
  const query = selection.in("status", publicPropertyStatuses)
    .eq("publish_on_site", true).is("deleted_at", null)
    .in("workflow_status", ["aprovado", "publicado"]);
  return { query };
}
