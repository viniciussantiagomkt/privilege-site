import { isIsolatedMediaPreview } from "@/lib/preview-media";
import { resolveVideoSource } from "@/lib/video-source";

interface VideoEmbedProps {
  url: string;
  title: string;
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const source = isIsolatedMediaPreview() ? null : resolveVideoSource(url);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/45 shadow-[0_24px_80px_rgba(3,15,24,0.06)]">
      {!source ? (
        <div role="status" aria-label={title} className="flex aspect-video flex-col items-center justify-center gap-2 p-5 text-center text-sm text-[#446E87]">
          <span className="max-w-full break-words">{title}</span>
          <span className="max-w-full break-words">{isIsolatedMediaPreview() ? "Mídia indisponível neste ambiente de testes" : "Mídia indisponível"}</span>
        </div>
      ) : source.type === "video" ? (
        <video controls className="aspect-video w-full bg-black" src={source.url}>
          <track kind="captions" />
        </video>
      ) : (
        <iframe
          title={title}
          src={source.url}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}
