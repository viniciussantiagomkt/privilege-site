export type VideoSource = { type: "video" | "iframe"; url: string };

export function resolveVideoSource(source: string): VideoSource | null {
  if (!source || /[\\\u0000-\u0020]/.test(source)) return null;
  const relative = source.startsWith("/") && !source.startsWith("//");
  let url: URL;
  try {
    url = new URL(source, relative ? "https://relative.invalid" : undefined);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return { type: "video", url: relative ? source : url.href };
  if (relative) return null;
  const youtube = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"];
  if (youtube.includes(url.hostname) || ["youtu.be", "www.youtu.be"].includes(url.hostname)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = url.hostname.endsWith("youtu.be") ? parts[0] : url.searchParams.get("v") ||
      (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null);
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
    const host = url.hostname.endsWith("youtube-nocookie.com") ? "www.youtube-nocookie.com" : "www.youtube.com";
    const embed = new URL(`https://${host}/embed/${id}`);
    const start = url.searchParams.get("start");
    if (start && /^\d{1,8}$/.test(start)) embed.searchParams.set("start", start);
    return { type: "iframe", url: embed.href };
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[0] === "video" ? parts[1] : parts[0];
    if (!id || !/^\d{1,15}$/.test(id)) return null;
    const embed = new URL(`https://player.vimeo.com/video/${id}`);
    const hash = url.searchParams.get("h") || (parts[0] !== "video" ? parts[1] : null);
    if (hash && /^[a-zA-Z0-9]{1,64}$/.test(hash)) embed.searchParams.set("h", hash);
    return { type: "iframe", url: embed.href };
  }
  return null;
}
