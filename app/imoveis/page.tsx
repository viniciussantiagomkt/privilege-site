"use client";

import { useMemo, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PropertyCard } from "@/components/PropertyCard";

import { properties } from "@/data/properties";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const categories = [
    "Todos",
    ...new Set(properties.map((item) => item.category)),
  ];

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        property.location
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        category === "Todos" ||
        property.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  return (
    <main>
      <Navbar />

      <section className="pt-40 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-sm">
              Imóveis
            </span>

            <h1 className="text-6xl font-bold mt-6">
              Encontre o imóvel ideal.
            </h1>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-14">
            <input
              type="text"
              placeholder="Buscar por imóvel ou localização"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="xl:col-span-3 h-16 rounded-2xl border border-white/10 bg-white/5 px-6 outline-none placeholder:text-white/30"
            />

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="h-16 rounded-2xl border border-white/10 bg-[#030F18] px-6 outline-none"
            >
              {categories.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}