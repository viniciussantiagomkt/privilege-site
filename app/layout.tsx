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

const gaId = process.env.NEXT_PUBLIC_GA4_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

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
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}

      {metaPixelId && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}
            (window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
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
