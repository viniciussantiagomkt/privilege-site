import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyViewTracker } from "@/components/PropertyViewTracker";
import { ShareButton } from "@/components/ShareButton";
import { WhatsAppLeadButton } from "@/components/WhatsAppLeadButton";
import { PropertyGallery } from "@/components/PropertyGallery";
import { VideoEmbed } from "@/components/VideoEmbed";
import { MinhaCasaMinhaVidaBadge } from "@/components/MinhaCasaMinhaVidaBadge";

import { createServerClient } from "@/lib/supabase-server";
import { getPropertyNumericPrice } from "@/lib/property-filters";
import { absoluteUrl, cleanMetadataText, companyWhatsApp, defaultOgImage, siteName } from "@/lib/site";
import { attachPropertyImages } from "@/lib/property-media";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import { Broker, Property, PropertyImage } from "@/types/property";
import type { Metadata } from "next";
import Image from "next/image";

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .single();

  const property = data as Property | null;

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title =
    cleanMetadataText(property.meta_title) ||
    `${property.title}${property.city ? ` em ${property.city}` : ""}`;
  const description =
    cleanMetadataText(property.meta_description, 40) ||
    property.description?.slice(0, 155) ||
    "Imóvel premium selecionado pela Privilege Imóveis.";
  const image =
    property.og_image ||
    property.main_image_url ||
    property.images?.[0] ||
    absoluteUrl(defaultOgImage);
  const path = `/imoveis/${property.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName,
      locale: "pt_BR",
      images: [{ url: absoluteUrl(image), alt: property.title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },
  };
}

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: propertyData } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .single();

  const [property] = propertyData
    ? attachPropertyImages([propertyData as Property], (await supabase
        .from("property_images")
        .select("property_id,url,is_main,sort_order")
        .eq("property_id", (propertyData as Property).id)).data as PropertyImage[] || [])
    : [];

  if (!property) {
    return (
      <main className="min-h-screen flex items-center justify-center text-[#030F18]">
        Imóvel não encontrado.
      </main>
    );
  }

  const { data: relatedData } = await supabase
    .from("properties")
    .select("*")
    .neq("id", property.id)
    .limit(6);

  const { data: brokerData } = property.broker_id
    ? await supabase
        .from("brokers")
        .select("*")
        .eq("id", property.broker_id)
        .maybeSingle()
    : { data: null };

  const broker = brokerData as Broker | null;

  const currentPrice = getPropertyNumericPrice(property.price);
  const relatedProperties = ((relatedData || []) as Property[])
    .map((item) => {
      const price = getPropertyNumericPrice(item.price);
      let score = 0;
      if (item.city_slug && item.city_slug === property.city_slug) score += 5;
      if (item.city && item.city === property.city) score += 4;
      if (item.category === property.category) score += 4;
      if (item.neighborhood && item.neighborhood === property.neighborhood) score += 3;
      if (currentPrice && price) {
        const diff = Math.abs(currentPrice - price) / currentPrice;
        if (diff <= 0.25) score += 2;
        if (diff <= 0.1) score += 2;
      }
      if (item.featured) score += 1;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, 3);

  const whatsappNumber = property.whatsapp || broker?.whatsapp || broker?.phone || companyWhatsApp;
  const whatsappUrl = createWhatsAppUrl(
    whatsappNumber,
    `Olá, tenho interesse no imóvel ${property.title}. Gostaria de receber mais informações.`
  );
  const images = [
    property.main_image_url,
    ...(property.images ?? []),
  ].filter((image, index, list): image is string => Boolean(image) && list.indexOf(image) === index);
  const videos = [
    property.video_url,
    ...(property.videos ?? []),
    property.virtual_tour_url,
  ].filter((video, index, list): video is string => Boolean(video) && list.indexOf(video) === index);
  const schemaImages = images.length ? images.map(absoluteUrl) : [absoluteUrl(defaultOgImage)];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": absoluteUrl(`/imoveis/${property.slug}#listing`),
    name: property.title,
    description: property.description,
    url: absoluteUrl(`/imoveis/${property.slug}`),
    image: schemaImages,
    datePosted: property.created_at,
    category: property.category,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city || property.location,
      addressRegion: "PB",
      addressCountry: "BR",
      streetAddress: property.address || property.location,
    },
    floorSize: property.area
      ? {
          "@type": "QuantitativeValue",
          value: property.area,
        }
      : undefined,
    numberOfRooms: property.bedrooms || undefined,
    offers: {
      "@type": "Offer",
      price: getPropertyNumericPrice(property.price) || undefined,
      priceCurrency: "BRL",
      availability: property.status === "vendido" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: absoluteUrl(`/imoveis/${property.slug}`),
    },
    broker: broker
      ? {
          "@type": "RealEstateAgent",
          name: broker.name || broker.email,
          telephone: broker.phone || broker.whatsapp,
          image: broker.avatar_url || absoluteUrl(defaultOgImage),
          url: absoluteUrl("/corretores"),
        }
      : undefined,
  };

  return (
    <main className="text-[#030F18]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyViewTracker propertyId={property.id} />
      <Navbar />

      <section className="relative px-5 pb-20 pt-32 md:px-6 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <Image
            src="/brand/symbol-blue.png"
            alt=""
            aria-hidden="true"
            width={544}
            height={340}
            className="pointer-events-none absolute right-0 top-28 hidden w-[34rem] opacity-[0.035] md:block"
          />
          <Breadcrumb
            items={[
              {
                label: "Home",
                href: "/",
              },
              {
                label: "Imóveis",
                href: "/imoveis",
              },
              {
                label: property.title,
              },
            ]}
          />

          <div className="mt-8 lg:mt-10">
            <div className="min-w-0 max-w-5xl">
              <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
                {property.category}
              </span>

              <h1 className="mt-4 text-[clamp(2.55rem,12vw,4rem)] font-bold leading-[1.02] md:text-6xl md:leading-tight">
                {property.title}
              </h1>

              <p className="mt-5 text-base leading-7 text-[#030F18]/58 md:mt-6 md:text-xl">
                {property.location}
              </p>

              {property.minha_casa_minha_vida && (
                <div className="mt-6 inline-flex flex-col gap-3 rounded-[24px] border border-[#446E87]/14 bg-[#D7E1DF]/58 p-4 shadow-[0_18px_50px_rgba(3,15,24,0.05)] sm:flex-row sm:items-center">
                  <MinhaCasaMinhaVidaBadge />
                  <span className="text-sm leading-6 text-[#030F18]/60">
                    Imóvel sinalizado como elegível ao programa Minha Casa Minha Vida.
                  </span>
                </div>
              )}
            </div>

          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:mt-20 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PropertyGallery images={images} title={property.title} />

              {videos.length > 0 && (
                <div className="mt-14 md:mt-20">
                  <h2 className="text-3xl font-bold md:text-4xl">Videos e tour</h2>
                  <div className="mt-8 grid gap-4">
                    {videos.map((video, index) => (
                      <VideoEmbed
                        key={`${video}-${index}`}
                        url={video}
                        title={`${property.title} - video ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-14 md:mt-20">
                <div className="mb-8 flex items-center gap-4 md:mb-10">
                  <Image
                    src="/brand/symbol-blue.png"
                    alt=""
                    aria-hidden="true"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain opacity-45"
                  />
                  <div className="h-px flex-1 bg-[#446E87]/14" />
                </div>
                <h2 className="text-3xl font-bold md:text-4xl">
                  Sobre o imóvel
                </h2>

                <p className="mt-6 text-base leading-7 text-[#030F18]/66 md:mt-8 md:text-lg md:leading-8">
                  {property.description}
                </p>
              </div>

              <div className="mt-14 grid grid-cols-2 gap-3 md:mt-20 md:grid-cols-4 md:gap-6">
                <div className="rounded-[22px] border border-[#446E87]/14 bg-[#D7E1DF]/48 p-5 md:rounded-[24px] md:p-6">
                  <span className="text-[#030F18]/50 text-sm">Quartos</span>
                  <h3 className="mt-4 text-2xl font-bold md:text-3xl">
                    {property.bedrooms ?? "-"}
                  </h3>
                </div>

                <div className="rounded-[22px] border border-[#446E87]/14 bg-[#D7E1DF]/48 p-5 md:rounded-[24px] md:p-6">
                  <span className="text-[#030F18]/50 text-sm">Banheiros</span>
                  <h3 className="mt-4 text-2xl font-bold md:text-3xl">
                    {property.bathrooms ?? "-"}
                  </h3>
                </div>

                <div className="rounded-[22px] border border-[#446E87]/14 bg-[#D7E1DF]/48 p-5 md:rounded-[24px] md:p-6">
                  <span className="text-[#030F18]/50 text-sm">Área</span>
                  <h3 className="mt-4 text-2xl font-bold md:text-3xl">
                    {property.area ?? "-"}
                  </h3>
                </div>

                <div className="rounded-[22px] border border-[#446E87]/14 bg-[#D7E1DF]/48 p-5 md:rounded-[24px] md:p-6">
                  <span className="text-[#030F18]/50 text-sm">Vagas</span>
                  <h3 className="mt-4 text-2xl font-bold md:text-3xl">
                    {property.garage ?? "-"}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <InfoCard label="Cidade" value={property.city || "-"} />
                <InfoCard label="Bairro" value={property.neighborhood || "-"} />
                <InfoCard label="Status" value={property.status || "ativo"} />
              </div>

              <div className="mt-16 md:mt-24">
                <h2 className="mb-8 text-3xl font-bold md:mb-10 md:text-4xl">
                  Localização
                </h2>

                <div className="overflow-hidden rounded-[32px] border border-[#446E87]/14 shadow-[0_24px_80px_rgba(3,15,24,0.06)]">
                  <iframe
                    title={`Mapa de ${property.title}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      property.latitude && property.longitude
                        ? `${property.latitude},${property.longitude}`
                        : property.address || property.location
                    )}&output=embed`}
                    width="100%"
                    height="420"
                    loading="lazy"
                    className="min-h-[360px] md:min-h-[500px]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:space-y-8">
              <div className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/55 p-6 shadow-[0_24px_80px_rgba(3,15,24,0.06)] md:rounded-[32px] md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#030F18]/50 text-sm">
                    Valor
                  </span>
                  <FavoriteButton
                    propertyId={property.id}
                    className="relative"
                  />
                </div>

                <h2 className="mt-4 text-4xl font-bold md:text-5xl">
                  {property.price}
                </h2>

                <p className="mt-5 text-sm leading-6 text-[#030F18]/58">
                  Confirme disponibilidade, condições e agendamento de visita com a equipe da Privilege.
                </p>

                <WhatsAppLeadButton
                  href={whatsappUrl}
                  propertyId={property.id}
                  propertyTitle={property.title}
                  propertySlug={property.slug}
                  source="imovel-whatsapp"
                  label="Chamar no WhatsApp"
                  className="mt-8 flex h-14 items-center justify-center rounded-2xl border border-[#25D366] bg-[#25D366] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(37,211,102,0.18)] transition duration-500 hover:border-[#1FB857] hover:bg-[#1FB857] md:h-16"
                />

                <ShareButton title={property.title} />
              </div>

              {broker && (
                <div className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/55 p-6 md:rounded-[32px] md:p-8">
                  <div className="flex items-center gap-4">
                    <Image
                      src={broker.avatar_url || "/brand/symbol-blue.png"}
                      alt={broker.name || "Corretor responsável"}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div>
                      <span className="text-[#030F18]/50 text-sm">Corretor responsável</span>
                      <h2 className="mt-2 text-2xl font-bold">{broker.name || broker.email}</h2>
                    </div>
                  </div>
                  {(broker.position || broker.role_title) && (
                    <p className="mt-4 text-[#030F18]/60">{broker.position || broker.role_title}</p>
                  )}
                  {broker.creci && (
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[#446E87]">{broker.creci}</p>
                  )}
                  {broker.phone && <p className="mt-3 text-[#030F18]/60">{broker.phone}</p>}
                  {broker.bio && <p className="mt-5 text-[#030F18]/60 leading-7">{broker.bio}</p>}
                  <div className="mt-6 grid gap-3">
                    {broker.instagram && (
                      <a
                        href={broker.instagram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram do corretor"
                        className="flex h-12 items-center justify-center rounded-2xl border border-[#1D4052]/18 text-sm text-[#1D4052] transition duration-500 hover:bg-white/45"
                      >
                        <Image
                          src="/social/instagram.png"
                          alt=""
                          aria-hidden="true"
                          width={26}
                          height={26}
                          className="h-6 w-6 object-contain"
                        />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {relatedProperties.length > 0 && (
            <div className="mt-20 md:mt-28">
              <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
                Imóveis relacionados
              </span>

              <h2 className="mb-8 mt-4 text-3xl font-bold md:mb-10 md:text-4xl">
                Seleções similares
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
                {relatedProperties.map((relatedProperty) => (
                  <PropertyCard
                    key={relatedProperty.id}
                    property={relatedProperty}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[#446E87]/14 bg-[#D7E1DF]/48 p-6">
      <span className="text-[#030F18]/50 text-sm">{label}</span>
      <h3 className="text-2xl font-bold mt-4">{value}</h3>
    </div>
  );
}


