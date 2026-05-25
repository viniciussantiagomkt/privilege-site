"use client";

import { Reveal } from "@/components/Reveal";
import { motion } from "framer-motion";

import { PropertyCard } from "@/components/PropertyCard";
import { Property } from "@/types/property";

interface FeaturedPropertiesProps {
  properties: Property[];
}

export function FeaturedProperties({
  properties,
}: FeaturedPropertiesProps) {
  const curatedProperties = properties.slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-[#E0E8E6] py-20 text-[#030F18] md:py-28">
      <Reveal>
        <div className="premium-shell relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mb-10 md:mb-14"
          >
            <div>
              <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.34em]">
                Imoveis exclusivos
              </span>

              <h2 className="mt-5 max-w-3xl text-[clamp(2.6rem,13vw,6.5rem)] font-semibold leading-[0.96] text-[#1D4052] md:leading-[0.94]">
                Selecionados para uma vida mais precisa.
              </h2>
            </div>

          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-4">
            {curatedProperties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 34 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.75,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <PropertyCard property={property} />
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
