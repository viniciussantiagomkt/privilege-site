"use client";

import { Heart } from "lucide-react";

import { useMemo, useSyncExternalStore } from "react";

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

  const favorites = useMemo(
    () => parseFavorites(favoritesSnapshot),
    [favoritesSnapshot]
  );

  const favorite =
    favorites.includes(propertyId);

  function toggleFavorite() {
    let updated: number[];

    if (favorites.includes(propertyId)) {
      updated = favorites.filter(
        (id: number) =>
          id !== propertyId
      );
    } else {
      updated = [
        ...favorites,
        propertyId,
      ];
    }

    localStorage.setItem(
      "favorites",
      JSON.stringify(updated)
    );

    trackEvent(favorites.includes(propertyId) ? "favorite_remove" : "favorite_add", {
      property_id: propertyId,
    });

    window.dispatchEvent(
      new Event(favoritesEvent)
    );
  }

  return (
    <button
      onClick={toggleFavorite}
      className={`${className} flex h-14 w-14 items-center justify-center rounded-full border border-[#E0E8E6]/24 bg-[#030F18]/28 text-[#E0E8E6] shadow-[0_14px_44px_rgba(3,15,24,0.16)] backdrop-blur-xl transition duration-500 hover:scale-105 hover:bg-[#E0E8E6]/22 ${
        favorite ? "border-red-500/40 bg-red-500/14 text-red-500" : ""
      }`}
      aria-label="Salvar imóvel nos favoritos"
    >
      <Heart
        className={
          favorite
            ? "fill-red-500 stroke-red-500 scale-110 transition duration-500"
            : "stroke-current transition duration-500"
        }
      />
    </button>
  );
}
