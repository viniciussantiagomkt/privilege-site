import Image from "next/image";

interface MinhaCasaMinhaVidaBadgeProps {
  compact?: boolean;
  className?: string;
}

export function MinhaCasaMinhaVidaBadge({
  compact = false,
  className = "",
}: MinhaCasaMinhaVidaBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/88 text-[#030F18] shadow-[0_14px_42px_rgba(3,15,24,0.12)] backdrop-blur-xl ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"} ${className}`}
    >
      <Image
        src="/programs/minha-casa-minha-vida.png"
        alt=""
        aria-hidden="true"
        width={compact ? 22 : 28}
        height={compact ? 22 : 28}
        className={`${compact ? "h-5 w-5" : "h-7 w-7"} object-contain`}
      />
      <span className="font-semibold leading-none">Minha Casa Minha Vida</span>
    </div>
  );
}
