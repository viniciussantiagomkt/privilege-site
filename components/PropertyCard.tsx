"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

import { FavoriteButton } from "./FavoriteButton";
import { MinhaCasaMinhaVidaBadge } from "./MinhaCasaMinhaVidaBadge";
import { getPropertyNumericPrice } from "@/lib/property-filters";
import { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({
  property,
}: PropertyCardProps) {
  const image =
    property.main_image_url ||
    property.images?.find(Boolean) ||
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85";

  return (
    <motion.article
      whileHover={{ y: -10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[24px] border border-[#446E87]/14 bg-[#E0E8E6]/70 p-2 shadow-[0_24px_80px_rgba(3,15,24,0.06)] backdrop-blur-xl md:rounded-[28px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-20 h-px w-44 rotate-[-42deg] bg-[#446E87]/18 transition duration-700 group-hover:bg-[#72A3BF]/30"
      />
      <Link href={property.slug ? `/imoveis/${property.slug}` : "/imoveis"} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#D7E1DF] sm:aspect-[16/11] md:rounded-[24px] xl:aspect-[5/4]">
          <Image
            src={image}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="scale-110 object-cover opacity-28 blur-2xl transition duration-1000 group-hover:scale-[1.15] group-hover:opacity-[0.34]"
            aria-hidden="true"
          />
          <Image
            src={image}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-contain p-1 transition duration-1000 group-hover:scale-[1.018]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030F18]/6 via-transparent to-[#030F18]/62" />
          <div className="absolute left-5 top-5 rounded-full border border-[#E0E8E6]/22 bg-[#030F18]/24 px-4 py-2 text-xs text-[#E0E8E6]/78 backdrop-blur-xl">
            {property.category}
          </div>
          {property.status && property.status !== "ativo" && (
            <div className="absolute right-5 top-5 rounded-full border border-[#E0E8E6]/22 bg-[#030F18]/24 px-4 py-2 text-xs text-[#E0E8E6]/78 backdrop-blur-xl">
              {property.status}
            </div>
          )}
          {property.minha_casa_minha_vida && (
            <MinhaCasaMinhaVidaBadge
              compact
              className="absolute bottom-5 left-5"
            />
          )}
        </div>

        <div className="px-3 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-[#1D4052] sm:text-2xl">
                {property.title || "Imóvel exclusivo"}
              </h3>

              <p className="mt-3 line-clamp-2 text-sm text-[#030F18]/52">
                {property.neighborhood || property.city
                  ? [property.neighborhood, property.city].filter(Boolean).join(" - ")
                  : property.location || "Localização sob consulta"}
              </p>
            </div>

            <span className="premium-chip h-9 shrink-0 px-3 text-xs sm:px-4">
              Ver
            </span>
          </div>

          <div className="mt-6 border-t border-[#446E87]/14 pt-5">
            <strong className="text-lg font-semibold text-[#1D4052]">
              {property.price || "Sob consulta"}
            </strong>
          </div>
        </div>
      </Link>

      <FavoriteButton
        propertyId={property.id}
        propertyTitle={property.title}
        propertyPrice={getPropertyNumericPrice(property.price)}
      />
    </motion.article>
  );
}
