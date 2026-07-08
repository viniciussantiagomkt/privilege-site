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

export function PropertyCard({ property }: PropertyCardProps) {
  const image =
    property.main_image_url ||
    property.images?.find(Boolean) ||
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85";

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[24px] border border-[#446E87]/14 bg-[#D7E1DF]/38 p-2 shadow-[0_18px_64px_rgba(3,15,24,0.045)] backdrop-blur-xl transition duration-700 hover:border-[#446E87]/24 hover:bg-[#D7E1DF]/54 hover:shadow-[0_26px_84px_rgba(3,15,24,0.075)] md:rounded-[28px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-20 h-px w-44 rotate-[-42deg] bg-[#446E87]/14 transition duration-700 group-hover:bg-[#72A3BF]/24"
      />

      <Link
        href={property.slug ? `/imoveis/${property.slug}` : "/imoveis"}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-[#446E87]/10 bg-[#E0E8E6]/76 sm:aspect-[16/11] md:rounded-[24px] xl:aspect-[5/4]">
          <Image
            src={image}
            alt={property.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-contain p-3 transition duration-1000 group-hover:scale-[1.015] sm:p-4"
          />

          {property.minha_casa_minha_vida && (
            <MinhaCasaMinhaVidaBadge
              compact
              className="absolute bottom-4 left-4"
            />
          )}
        </div>

        <div className="px-3 pb-4 pt-5 sm:px-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-[#1D4052] sm:text-2xl">
              {property.title || "Imóvel exclusivo"}
            </h3>

            <p className="mt-3 line-clamp-1 text-sm text-[#030F18]/52">
              {property.neighborhood || property.city
                ? [property.neighborhood, property.city].filter(Boolean).join(" - ")
                : property.location || "Localização sob consulta"}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#446E87]/14 pt-5">
            <strong className="text-lg font-semibold text-[#1D4052]">
              {property.price || "Sob consulta"}
            </strong>
            <span className="shrink-0 text-xs uppercase tracking-[0.22em] text-[#446E87]/80 transition duration-500 group-hover:text-[#1D4052]">
              Ver imóvel
            </span>
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
