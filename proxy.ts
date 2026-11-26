import { NextResponse, type NextRequest } from "next/server";
import { operationalRouteBlocked } from "@/lib/crm/release-scope";

export function proxy(request: NextRequest) {
  if (operationalRouteBlocked(request.nextUrl.pathname, {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    CRM_OPERATIONAL_SCOPE: process.env.CRM_OPERATIONAL_SCOPE,
  })) return NextResponse.json({ error: "Funcionalidade fora do escopo desta homologação." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/:path*", "/apresentacao/:path*", "/apresentacoes/:path*"] };
