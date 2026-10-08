import type { NextConfig } from "next";
import { createHash } from "node:crypto";

// Fail before build-time data fetching if this review branch is accidentally deployed.
if (process.env.VERCEL_GIT_COMMIT_REF === "work/crm-staging-audit-20261008") {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (process.env.VERCEL_ENV === "production" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://sdpqphiooiuglywcmkxv.supabase.co" ||
      createHash("sha256").update(key).digest("hex") !== "1d6911a13f337d0eec833199e2ed4b45ad44f2262e0b9a1e5b25c7c33ae131d5" ||
      process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("CRM review branch requires the verified staging environment and public staging key, without a service-role key.");
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
