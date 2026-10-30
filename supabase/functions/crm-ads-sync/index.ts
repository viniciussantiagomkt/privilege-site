// @ts-expect-error Deno requires explicit TypeScript extensions.
import { syncAds } from "../_shared/ads/worker.ts";
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
Deno.serve(request=>syncAds(request,{
 url:Deno.env.get("SUPABASE_URL")||"",serviceKey:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",
 cronSecret:Deno.env.get("CRM_ADS_CRON_SECRET")||"",connections:Deno.env.get("CRM_ADS_CONNECTIONS")||"[]",
}));
