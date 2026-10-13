import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { UUID, type PublicPresentation } from "@/lib/crm/marketing";
import { PresentationConsent } from "@/components/PresentationConsent";
import "./presentation.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Imóveis selecionados para você | Privilege",
  description:
    "Conheça as características e os materiais aprovados dos imóveis selecionados.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  alternates: { canonical: null },
  openGraph: {
    title: "Uma seleção de imóveis para você",
    description: "Conheça sua apresentação Privilege Imóveis.",
    url: null,
    images: [],
  },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const { data, error } = await createServerClient().rpc(
    "crm_public_presentation",
    { target_token: token },
  );
  if (error)
    throw new Error(
      "A apresentação está temporariamente indisponível. Tente novamente.",
    );
  if (!data) notFound();
  const presentation = data as PublicPresentation;
  const phone = presentation.broker?.phone?.replace(/\D/g, "");
  const whatsapp =
    phone && phone.length >= 10
      ? `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}`
      : null;
  return (
    <main className="privilege-presentation">
      <header>
        <Image
          src="/brand/logo-horizontal-blue.png"
          width={230}
          height={70}
          alt="Privilege Imóveis"
        />
        <span>Uma seleção feita para você</span>
      </header>
      <section className="presentation-intro">
        <p>ONDE O PRIVILÉGIO TEM ENDEREÇO.</p>
        <h1>{presentation.title}</h1>
        <p>{presentation.message}</p>
      </section>
      {presentation.properties.map((p) => (
        <article className="presentation-property" key={p.id}>
          <div className="presentation-cover">
            {p.images?.[0] && (
              <Image
                src={p.images[0]}
                alt={p.title}
                width={1400}
                height={850}
                unoptimized
                priority
              />
            )}
            <span>{p.property_code}</span>
          </div>
          <div className="presentation-property-body">
            <p>
              {p.location} · {p.status}
            </p>
            <h2>{p.title}</h2>
            <strong className="presentation-price">{p.price}</strong>
            <div className="presentation-specs">
              {p.area && <span>{p.area} m²</span>}
              <span>{p.bedrooms} quartos</span>
              <span>{p.bathrooms} banheiros</span>
              <span>{p.garage} vagas</span>
            </div>
            <p className="presentation-description">{p.description}</p>
            <div className="presentation-gallery">
              {p.images?.slice(1).map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    src={url}
                    alt={`${p.title} · Foto ${i + 2}`}
                    width={600}
                    height={400}
                    unoptimized
                  />
                </a>
              ))}
            </div>
            <div className="presentation-materials">
              {p.videos
                ?.filter((v) => /^https:\/\//.test(v))
                .map((url, i) => (
                  <a
                    key={`${url}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver vídeo {i + 1}
                  </a>
                ))}
            </div>
          </div>
        </article>
      ))}
      {presentation.assets.length > 0 && (
        <section className="presentation-extra">
          <h2>Materiais selecionados</h2>
          <div className="presentation-materials">
            {presentation.assets.map((a) => (
              <article key={a.id}>
                {a.mime_type.startsWith("image/") && (
                  <Image
                    src={`/api/presentation-media/${token}/${a.id}`}
                    alt={a.title}
                    width={600}
                    height={400}
                    unoptimized
                  />
                )}
                {a.mime_type === "video/mp4" && (
                  <video
                    src={`/api/presentation-media/${token}/${a.id}`}
                    controls
                    preload="metadata"
                  />
                )}
                <h3>{a.title}</h3>
                <p>
                  {a.category} · {(a.size_bytes / 1048576).toFixed(1)} MB
                </p>
                <a
                  href={`/api/presentation-media/${token}/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir material
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="presentation-contact">
        <h2>Vamos conversar sobre seu próximo imóvel?</h2>
        <p>
          {presentation.broker?.name || "Equipe Privilege Imóveis"}
          {presentation.broker?.creci &&
            ` · CRECI ${presentation.broker.creci}`}
        </p>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer">
            Falar com o corretor no WhatsApp
          </a>
        ) : (
          <Link href="/contato">Falar com a Privilege</Link>
        )}
      </section>
      <PresentationConsent token={token} />
      <footer>
        Privilege Imóveis · CRECI 839J
        <br />
        Disponibilidade e condições sujeitas à confirmação. Link válido até{" "}
        {new Date(presentation.expires_at).toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}
        .
      </footer>
    </main>
  );
}
