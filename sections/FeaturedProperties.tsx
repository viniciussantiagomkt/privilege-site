"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

import { motion } from "framer-motion";

import { PropertyCard } from "@/components/PropertyCard";
import { properties } from "@/data/properties";

export function FeaturedProperties() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#72A3BF]/10 blur-[180px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-16"
        >
          <div>
            <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-sm">
              Imóveis exclusivos
            </span>

            <h2 className="text-5xl font-bold mt-4 max-w-2xl leading-tight">
              Selecionados para quem valoriza sofisticação.
            </h2>
          </div>

          <button className="hidden md:flex px-6 py-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:border-[#72A3BF]/40 transition">
            Ver todos
          </button>
        </motion.div>

        <Swiper
          modules={[Autoplay]}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
          }}
          spaceBetween={30}
          loop
          breakpoints={{
            320: {
              slidesPerView: 1,
            },

            768: {
              slidesPerView: 2,
            },

            1280: {
              slidesPerView: 3,
            },
          }}
        >
          {properties.map((property) => (
            <SwiperSlide key={property.id}>
              <PropertyCard property={property} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}