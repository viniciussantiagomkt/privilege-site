export function PropertySkeleton() {
  return (
    <div className="rounded-[32px] overflow-hidden border border-white/10 bg-white/5 animate-pulse">
      <div className="h-[520px] bg-white/10" />

      <div className="p-8">
        <div className="w-24 h-4 bg-white/10 rounded-full" />

        <div className="w-3/4 h-10 bg-white/10 rounded-full mt-6" />

        <div className="w-1/2 h-5 bg-white/10 rounded-full mt-4" />

        <div className="flex items-center justify-between mt-10">
          <div className="w-32 h-8 bg-white/10 rounded-full" />

          <div className="w-28 h-12 bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}