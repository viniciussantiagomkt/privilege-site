"use client";

import { motion } from "framer-motion";

import { Property } from "@/types/property";
import Link from "next/link";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({
  property,
}: PropertyCardProps) {
  return (
    <Link href={`/imoveis/${property.slug}`}>
  <motion.div
      whileHover={{ y: -10 }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#030F18]/90 z-10" />

      <div className="overflow-hidden">
        <img
  src={property.images[0]}
  alt={property.title}
  className="h-[520px] w-full object-cover transition duration-700 group-hover:scale-110"
/>
      </div>

      <div className="absolute bottom-0 left-0 z-20 p-8 w-full">
        <span className="text-sm uppercase tracking-[0.3em] text-[#72A3BF]">
          {property.category}
        </span>

        <h3 className="text-3xl font-bold mt-4 leading-snug">
          {property.title}
        </h3>

        <p className="text-white/60 mt-3">
          {property.location}
        </p>

        <div className="flex items-center justify-between mt-8">
          <strong className="text-xl">
            {property.price}
          </strong>

          <button className="px-5 py-3 rounded-full bg-[#72A3BF] text-black font-semibold transition hover:scale-105">
            Ver imóvel
          </button>
        </div>
      </div>
    </motion.div>
    </Link>
  );
}