import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E0E8E6]">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full border border-[#446E87]/12" />
        <Image
          src="/brand/symbol-blue.png"
          alt="Carregando Privilege Imóveis"
          width={64}
          height={64}
          className="h-16 w-16 animate-pulse object-contain opacity-80"
        />
      </div>
    </main>
  );
}
