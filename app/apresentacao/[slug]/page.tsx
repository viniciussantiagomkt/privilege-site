import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Apresentação do imóvel", robots: { index: false, follow: false } };

export default async function PresentationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data, error } = await createServerClient().from("properties")
    .select("title,slug,description,location,price,images,property_code,status")
    .eq("slug", slug).eq("presentation_enabled", true).eq("publish_on_site", true)
    .is("deleted_at", null).in("workflow_status", ["aprovado", "publicado"]).maybeSingle();
  if (error) throw new Error("Não foi possível carregar a apresentação.");
  if (!data) notFound();
  return <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
    <article className="mx-auto max-w-4xl space-y-6 rounded-3xl bg-white p-6 md:p-10">
      <p className="text-sm uppercase tracking-widest">Privilege Imóveis · {data.property_code}</p>
      <h1 className="text-4xl font-bold">{data.title}</h1>
      <p>{data.location} · {data.status}</p><p className="text-2xl font-semibold">{data.price}</p>
      {data.images?.[0] && <Image src={data.images[0]} width={1200} height={800} alt={data.title} className="w-full rounded-2xl object-cover" />}
      <p className="whitespace-pre-line">{data.description}</p>
      <Link className="inline-block rounded-xl bg-blue-900 px-6 py-3 text-white" href={"/imoveis/" + data.slug}>Ver detalhes e falar com a Privilege</Link>
    </article>
  </main>;
}
