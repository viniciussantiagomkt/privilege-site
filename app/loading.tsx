export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E0E8E6]">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[#446E87]/12 animate-ping" />
        <img
          src="/brand/symbol-blue.png"
          alt="Carregando Privilege Imoveis"
          className="h-16 w-16 object-contain opacity-80 animate-pulse"
        />
      </div>
    </main>
  );
}
