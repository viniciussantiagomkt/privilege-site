interface VideoEmbedProps {
  url: string;
  title: string;
}

function getEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }

    return url;
  } catch {
    return url;
  }
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const embedUrl = getEmbedUrl(url);
  const isDirectVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/45 shadow-[0_24px_80px_rgba(3,15,24,0.06)]">
      {isDirectVideo ? (
        <video controls className="aspect-video w-full bg-black" src={url}>
          <track kind="captions" />
        </video>
      ) : (
        <iframe
          title={title}
          src={embedUrl}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}
