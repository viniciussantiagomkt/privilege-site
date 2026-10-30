import { cache } from "react";
import { createServerClient } from "@/lib/supabase-server";
import { publicPropertyQuery } from "@/lib/property-publication";
import { attachPropertyImages } from "@/lib/property-media";
import type { Broker, Property, PropertyImage } from "@/types/property";
export const loadCampaignProperty=cache(async(slug:string)=>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;
 const db=createServerClient();
 const {query}=await publicPropertyQuery(db);
 const {data,error}=await query.eq("slug",slug).eq("status","ativo").eq("available_for_campaigns",true).maybeSingle();
 if(error)throw Error("Não foi possível consultar este imóvel agora.");
 if(!data)return null;
 const property=data as Property;
 const [media,broker]=await Promise.all([
  db.from("property_images").select("property_id,url,is_main,sort_order").eq("property_id",property.id),
  property.broker_id?db.from("brokers").select("id,name,whatsapp,phone,creci,active").eq("id",property.broker_id).eq("active",true).maybeSingle():Promise.resolve({data:null,error:null}),
 ]);
 if(media.error)throw Error("Não foi possível consultar as fotos deste imóvel.");
 return {property:attachPropertyImages([property],media.data as PropertyImage[]||[])[0],broker:broker.error?null:broker.data as Broker|null};
});
