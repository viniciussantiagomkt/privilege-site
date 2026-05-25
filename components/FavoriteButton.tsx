"use client";

import { Heart } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { trackEvent } from "@/lib/analytics";

interface FavoriteButtonProps {
  propertyId: number;
  className?: string;
}

const favoritesEvent = "favorites:update";

function getFavoritesSnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }

  return localStorage.getItem("favorites") || "[]";
}

function subscribeToFavorites(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(favoritesEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(favoritesEvent, onStoreChange);
  };
}

function parseFavorites(value: string) {
  try {
    return JSON.parse(value) as number[];
  } catch {
    return [];
  }
}

export function FavoriteButton({
  propertyId,
  className = "absolute top-6 right-6 z-30",
}: FavoriteButtonProps) {
  const favoritesSnapshot = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    () => "[]"
  );

  const favorites = useMemo(() => parseFavorites(favoritesSnapshot), [favoritesSnapshot]);
  const favorite = favorites.includes(propertyId);
  const [feedback, setFeedback] = useState("");

  function toggleFavorite() {
    const updated = favorite
      ? favorites.filter((id: number) => id !== propertyId)
      : [...favorites, propertyId];

    localStorage.setItem("favorites", JSON.stringify(updated));

    trackEvent(favorite ? "favorite_remove" : "favorite_add", {
      property_id: propertyId,
    });

    setFeedback(favorite ? "Removido" : "Salvo nos favoritos");
    window.setTimeout(() => setFeedback(""), 1500);
    window.dispatchEvent(new Event(favoritesEvent));
  }

  return (
    <span className={`${className} inline-flex items-center`}>
      <button
        onClick={toggleFavorite}
        className={`flex h-14 w-14 items-center justify-center rounded-full border border-[#E0E8E6]/24 bg-[#030F18]/28 text-[#E0E8E6] shadow-[0_14px_44px_rgba(3,15,24,0.16)] backdrop-blur-xl transition duration-500 hover:scale-105 hover:bg-[#E0E8E6]/22 ${
          favorite ? "border-red-500/40 bg-red-500/14 text-red-500" : ""
        }`}
        aria-label="Salvar imóvel nos favoritos"
      >
        <Heart
          className={
            favorite
              ? "scale-110 fill-red-500 stroke-red-500 transition duration-500"
              : "stroke-current transition duration-500"
          }
        />
      </button>
      {feedback && (
        <span className="pointer-events-none absolute -bottom-9 right-0 whitespace-nowrap rounded-full border border-[#E0E8E6]/24 bg-[#030F18]/72 px-3 py-1 text-xs text-[#E0E8E6] opacity-95 shadow-[0_14px_40px_rgba(3,15,24,0.14)] backdrop-blur-xl">
          {feedback}
        </span>
      )}
    </span>
  );
}
