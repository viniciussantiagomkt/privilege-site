import type { Metadata } from "next";
import Script from "next/script";

import {
  absoluteUrl,
  companyEmail,
  companyPhone,
  defaultDescription,
  defaultOgImage,
  defaultTitle,
  localKeywords,
  siteName,
  siteUrl,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: localKeywords,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/brand/favicon.png",
    shortcut: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    siteName,
    locale: "pt_BR",
    type: "website",
    url: "/",
    images: [
      {
        url: absoluteUrl(defaultOgImage),
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [absoluteUrl(defaultOgImage)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-5FJ54Q2C";

const businessJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: siteName,
      url: siteUrl,
      logo: absoluteUrl("/brand/logo-horizontal-blue.png"),
      image: absoluteUrl(defaultOgImage),
      email: companyEmail,
      telephone: companyPhone,
      sameAs: [
        "https://www.instagram.com/privilege_imoveis/",
        "https://youtube.com",
        "https://tiktok.com",
      ],
    },
    {
      "@type": "RealEstateAgent",
      "@id": absoluteUrl("/#real-estate-agent"),
      name: siteName,
      url: siteUrl,
      logo: absoluteUrl("/brand/logo-horizontal-blue.png"),
      image: absoluteUrl(defaultOgImage),
      email: companyEmail,
      telephone: companyPhone,
      priceRange: "$$$",
      areaServed: ["Campina Grande", "João Pessoa", "Paraíba"],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Campina Grande",
        addressRegion: "PB",
        addressCountry: "BR",
      },
      parentOrganization: {
        "@id": absoluteUrl("/#organization"),
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      {gtmId && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      )}

      {clarityId && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      )}
      <body>
        {gtmId && (
          <noscript>
            <iframe
              title="Google Tag Manager"
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <Script
          id="business-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
