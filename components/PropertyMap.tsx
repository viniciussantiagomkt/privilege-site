import { isIsolatedMediaPreview } from "@/lib/preview-media";

export function PropertyMap({ query, title, height, className = "" }: {
  query: string; title: string; height: number; className?: string;
}) {
  if (isIsolatedMediaPreview()) {
    return <div role="status" aria-label={title} style={{ minHeight: height }}
      className={`flex items-center justify-center px-5 text-center text-sm text-[#446E87] ${className}`}>
      Mapa indisponível neste ambiente de testes
    </div>;
  }
  return <iframe title={title}
    src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
    width="100%" height={height} loading="lazy" className={className} />;
}
