// @ts-expect-error Deno requires explicit TypeScript extensions; Next.js does not bundle this entrypoint.
import { presentationMedia } from "../_shared/presentation-media.ts";
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
Deno.serve(request => presentationMedia(request, {
  url: Deno.env.get("SUPABASE_URL") || "",
  publicKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
  storageKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
}));
