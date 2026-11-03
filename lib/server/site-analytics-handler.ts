import {Ga4Error} from "./ga4-reporting";
import type {AnalyticsDays,SiteAnalyticsReport} from "@/lib/crm/site-analytics";
interface Dependencies{
 authorize:(token:string)=>Promise<200|401|403|503>;
 report:(days:AnalyticsDays)=>Promise<SiteAnalyticsReport>;
}
function response(status:number,body:unknown){return Response.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Authorization"}});}
const errors:Record<string,string>={not_configured:"A consulta ao Google Analytics ainda não foi conectada. A coleta do site é independente deste painel.",invalid_config:"A configuração de consulta do Analytics precisa ser revisada pela administração.",provider_access:"O acesso de leitura à propriedade do Analytics precisa ser conferido.",quota:"O Google limitou as consultas por enquanto. Tente novamente mais tarde.",unavailable:"Não foi possível consultar o Google Analytics agora.",invalid_response:"O Google retornou um relatório que não pôde ser validado."};
export async function siteAnalyticsHandler(request:Request,deps:Dependencies):Promise<Response>{
 if(request.method!=="GET")return response(405,{error:"Método não permitido."});
 const token=request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9._-]{20,8192})$/)?.[1];
 if(!token)return response(401,{error:"Entre novamente no CRM para consultar os dados."});
 let allowed:number;try{allowed=await deps.authorize(token);}catch{return response(503,{error:"Não foi possível conferir sua sessão agora."});}
 if(allowed!==200)return response(allowed,{error:allowed===403?"Este painel está disponível para gestores e administradores.":allowed===401?"Sessão inválida. Entre novamente no CRM.":"Não foi possível conferir sua sessão agora."});
 const url=new URL(request.url),values=url.searchParams.getAll("days");
 const raw=values[0]??"28";
 if(values.length>1||!["7","28","90"].includes(raw)||[...url.searchParams.keys()].some(k=>k!=="days"))return response(400,{error:"Escolha um período de 7, 28 ou 90 dias."});
 try{return response(200,{data:await deps.report(Number(raw) as AnalyticsDays)});}
 catch(e){const code=e instanceof Ga4Error?e.code:"unavailable";return response(503,{code,error:errors[code]});}
}
