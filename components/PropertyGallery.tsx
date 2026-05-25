"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

const fallbackImage =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const galleryImages = images.length ? images : [fallbackImage];
  const galleryLength = galleryImages.length;
  const activeImage = activeIndex !== null ? galleryImages[activeIndex] : null;

  const move = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => {
      if (current === null) return 0;
      return (current + direction + galleryLength) % galleryLength;
    });
  }, [galleryLength]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (activeIndex === null) return;
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, move]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {galleryImages.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            onClick={() => setActiveIndex(index)}
            className={`group relative overflow-hidden rounded-[28px] border border-[#446E87]/14 shadow-[0_24px_80px_rgba(3,15,24,0.07)] md:rounded-[32px] ${
              index === 0 ? "md:col-span-2" : ""
            }`}
          >
            <Image
              src={image}
              alt={`${title} - imagem ${index + 1}`}
              width={1400}
              height={index === 0 ? 900 : 700}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 66vw, 820px"
              className={`${index === 0 ? "aspect-[4/5] md:h-[560px] md:aspect-auto" : "aspect-[4/5] md:h-[360px] md:aspect-auto"} w-full object-cover transition duration-700 group-hover:scale-105`}
            />
          </button>
        ))}
      </div>

      {activeImage && activeIndex !== null && (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-[#030F18]/96 p-4 text-[#E0E8E6] md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-[#E0E8E6]/60">
              {activeIndex + 1} / {galleryImages.length}
            </span>
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E0E8E6]/16"
              aria-label="Fechar galeria"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <Image
              src={activeImage}
              alt={`${title} - imagem ampliada`}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#E0E8E6]/16 bg-[#030F18]/42"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#E0E8E6]/16 bg-[#030F18]/42"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                key={`thumb-${image}-${index}`}
                onClick={() => setActiveIndex(index)}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border ${
                  index === activeIndex ? "border-[#E0E8E6]" : "border-[#E0E8E6]/14"
                }`}
              >
                <Image src={image} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
