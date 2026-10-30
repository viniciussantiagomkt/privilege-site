import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCampaignProperty } from "@/lib/campaign-property";
import { PropertyGallery } from "@/components/PropertyGallery";
import { CampaignWhatsAppButton } from "@/components/CampaignWhatsAppButton";
import { getPropertyNumericPrice } from "@/lib/property-filters";
import { companyWhatsApp } from "@/lib/site";
import "./landing.css";
export const dynamic="force-dynamic";
interface Props{params:Promise<{slug:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;const data=await loadCampaignProperty(slug);
 if(!data)return {title:"Imóvel indisponível",robots:{index:false,follow:false}};
 return {title:data.property.title,description:data.property.description?.slice(0,155),robots:{index:false,follow:true},alternates:{canonical:`/imoveis/${slug}`}};
}
export default async function CampaignPropertyPage({params}:Props){
 const {slug}=await params;const data=await loadCampaignProperty(slug);if(!data)notFound();
 const {property:p,broker}=data;
 const raw=(broker?.whatsapp||broker?.phone||companyWhatsApp).replace(/\D/g,"");
 const candidate=raw.startsWith("55")?raw:`55${raw}`;
 const validContact=/^55\d{10,11}$/.test(candidate);
 const phone=validContact?candidate:companyWhatsApp;
 const recipient=validContact&&broker?.name?broker.name:"a equipe Privilege";
 const price=getPropertyNumericPrice(p.price);
 const details=[[p.bedrooms,"Quartos"],[p.suites,"Suítes"],[p.bathrooms,"Banheiros"],[p.garage,"Vagas"],[p.area,"Área (m²)"]].filter(([value])=>value!==null&&value!==undefined&&value!==""&&value!==0);
 const cta={phone,title:p.title,propertyCode:p.property_code||"",propertyId:p.id};
 return <div className="campaign-landing">
  <header><Link href="/" aria-label="Privilege Imóveis, página inicial"><Image src="/brand/logo-horizontal-blue.png" alt="Privilege Imóveis" width={200} height={64}/></Link><Link href={`/imoveis/${p.slug}`}>Ver ficha completa ↗</Link></header>
  <main>
   <section className="campaign-hero"><div><p className="campaign-eyebrow">Seu próximo endereço</p><h1>{p.title}</h1><p className="campaign-location">{[p.neighborhood,p.city].filter(Boolean).join(" · ")||p.location}</p><p className="campaign-price">{price?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(price):"Valor sob consulta"}</p>{p.property_code&&<p className="campaign-code">Código {p.property_code}</p>}<CampaignWhatsAppButton {...cta} location="hero" label="Quero conhecer este imóvel"/><small>Converse com {recipient} e confirme as condições e a disponibilidade.</small></div><div className="campaign-cover">{p.images.length?<Image src={p.images[0]} alt={p.title} width={1100} height={800} priority unoptimized/>:<div className="campaign-no-photo">Fotos em atualização</div>}</div></section>
   <section className="campaign-details" aria-label="Características do imóvel">{details.map(([value,label])=><div key={String(label)}><strong>{String(value)}</strong><span>{label}</span></div>)}</section>
   <section className="campaign-story"><p className="campaign-eyebrow">Conheça os detalhes</p><h2>Um lugar para o seu próximo capítulo.</h2><p>{p.description||"Fale com nossa equipe para conhecer os detalhes deste imóvel."}</p></section>
   {p.images.length>0&&<section className="campaign-gallery"><h2>Veja cada ambiente</h2><PropertyGallery images={p.images} title={p.title}/></section>}
   <section className="campaign-contact"><div><p className="campaign-eyebrow">Atendimento Privilege</p><h2>Vamos conhecer de perto?</h2><p>Tire suas dúvidas e combine uma visita pelo WhatsApp.</p></div><CampaignWhatsAppButton {...cta} location="footer" label="Falar sobre este imóvel"/></section>
  </main><footer><p>Privilege Imóveis · CRECI 839J</p><p>Valores e disponibilidade sujeitos a confirmação.</p></footer>
  <div className="campaign-mobile-cta"><CampaignWhatsAppButton {...cta} location="mobile" label="Conversar no WhatsApp"/></div>
 </div>;
}
