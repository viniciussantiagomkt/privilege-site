"use client";

import { useState } from "react";

interface ShareButtonProps {
  title?: string;
}

export function ShareButton({ title = "Privilege Imóveis" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title,
      text: "Confira este imóvel exclusivo.",
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);

    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-4 grid gap-3">
      <button
        onClick={handleShare}
        className="h-14 w-full rounded-2xl border border-[#030F18]/14 bg-transparent text-[#030F18]/70 transition duration-500 hover:border-[#446E87]/42 hover:bg-white/30 md:h-16"
      >
        {copied ? "Link copiado" : "Compartilhar imóvel"}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${title} ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center rounded-2xl border border-[#25D366] bg-[#25D366] text-sm text-white"
        >
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center rounded-2xl border border-[#1D4052]/18 text-sm text-[#1D4052]"
        >
          Facebook
        </a>
      </div>
    </div>
  );
}
