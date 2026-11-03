import {createClient} from "@supabase/supabase-js";
import {siteAnalyticsHandler} from "@/lib/server/site-analytics-handler";
import {cachedGa4Report} from "@/lib/server/ga4-reporting";
export const runtime="nodejs";
export async function GET(request:Request){
 return siteAnalyticsHandler(request,{
  authorize:async token=>{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
   if(!url||!key)return 503;
   const db=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await db.auth.getUser(token);
   if(error||!data.user)return error&&error.status&&error.status>=500?503:401;
   const permission=await db.rpc("can_manage_operations");
   if(permission.error)return 503;return permission.data===true?200:403;
  },
  report:days=>cachedGa4Report({propertyId:process.env.GA4_PROPERTY_ID||"",serviceAccountJson:process.env.GA4_SERVICE_ACCOUNT_JSON||""},days),
 });
}
