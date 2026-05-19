"use client";

export function ShareButton() {
  async function handleShare() {
    await navigator.share({
      title: "Privilege Imoveis",
      text: "Confira este imóvel exclusivo.",
      url: window.location.href,
    });
  }

  return (
    <button
      onClick={handleShare}
      className="w-full py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition"
    >
      Compartilhar imóvel
    </button>
  );
}