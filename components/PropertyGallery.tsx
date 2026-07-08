"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

const fallbackImage =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const galleryImages = images.length ? images : [fallbackImage];
  const galleryLength = galleryImages.length;
  const activeImage = activeIndex !== null ? galleryImages[activeIndex] : null;

  const moveFullscreen = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => {
      if (current === null) return 0;
      return (current + direction + galleryLength) % galleryLength;
    });
  }, [galleryLength]);

  const moveCarousel = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => (current + direction + galleryLength) % galleryLength);
  }, [galleryLength]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (activeIndex !== null) {
        if (event.key === "Escape") setActiveIndex(null);
        if (event.key === "ArrowLeft") moveFullscreen(-1);
        if (event.key === "ArrowRight") moveFullscreen(1);
        return;
      }

      if (event.key === "ArrowLeft") moveCarousel(-1);
      if (event.key === "ArrowRight") moveCarousel(1);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, moveCarousel, moveFullscreen]);

  return (
    <>
      <div className="overflow-hidden rounded-[30px] border border-[#446E87]/14 bg-[#D7E1DF]/42 p-2 shadow-[0_24px_80px_rgba(3,15,24,0.06)] md:rounded-[36px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-[#446E87]/10 bg-[#E0E8E6]/74 md:aspect-[16/10] md:rounded-[30px]">
          <Image
            src={galleryImages[selectedIndex]}
            alt={`${title} - imagem ${selectedIndex + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-contain p-3 transition duration-700 md:p-5"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#030F18]/18 to-transparent" />

          <div className="absolute left-4 top-4 rounded-full border border-[#030F18]/8 bg-[#E0E8E6]/82 px-4 py-2 text-xs font-medium text-[#1D4052] shadow-[0_12px_36px_rgba(3,15,24,0.08)] backdrop-blur-xl">
            {selectedIndex + 1} / {galleryLength}
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex(selectedIndex)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#030F18]/8 bg-[#E0E8E6]/82 text-[#1D4052] shadow-[0_12px_36px_rgba(3,15,24,0.08)] backdrop-blur-xl transition duration-500 hover:bg-[#1D4052] hover:text-[#E0E8E6]"
            aria-label="Ampliar imagem"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {galleryLength > 1 && (
            <>
              <button
                type="button"
                onClick={() => moveCarousel(-1)}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#030F18]/8 bg-[#E0E8E6]/86 text-[#1D4052] shadow-[0_14px_42px_rgba(3,15,24,0.10)] backdrop-blur-xl transition duration-500 hover:bg-[#1D4052] hover:text-[#E0E8E6]"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => moveCarousel(1)}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#030F18]/8 bg-[#E0E8E6]/86 text-[#1D4052] shadow-[0_14px_42px_rgba(3,15,24,0.10)] backdrop-blur-xl transition duration-500 hover:bg-[#1D4052] hover:text-[#E0E8E6]"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {galleryLength > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:mt-4 md:gap-3">
            {galleryImages.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                onClick={() => setSelectedIndex(index)}
                className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border bg-[#E0E8E6]/70 transition duration-500 md:h-24 md:w-32 ${
                  index === selectedIndex
                    ? "border-[#1D4052] shadow-[0_12px_36px_rgba(29,64,82,0.14)]"
                    : "border-[#446E87]/14 opacity-72 hover:border-[#446E87]/34 hover:opacity-100"
                }`}
                aria-label={`Selecionar imagem ${index + 1}`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-contain p-1.5"
                />
              </button>
            ))}
          </div>
        )}
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
                  onClick={() => moveFullscreen(-1)}
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#E0E8E6]/16 bg-[#030F18]/42"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => moveFullscreen(1)}
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
