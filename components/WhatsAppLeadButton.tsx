"use client";

import Image from "next/image";

import { trackEvent } from "@/lib/analytics";

interface WhatsAppLeadButtonProps {
  href: string;
  label?: string;
  propertyId?: number;
  propertyTitle?: string;
  propertySlug?: string;
  source?: string;
  className?: string;
}

export function WhatsAppLeadButton({
  href,
  label = "WhatsApp",
  propertyId,
  propertyTitle,
  propertySlug,
  source = "whatsapp",
  className = "",
}: WhatsAppLeadButtonProps) {
  function trackLead() {
    trackEvent("whatsapp_click", {
      source,
      property_id: propertyId ?? null,
      property_slug: propertySlug ?? null,
    });

    const payload = {
      name: "Contato via WhatsApp",
      phone: "whatsapp",
      source,
      property_id: propertyId ?? null,
      property_title: propertyTitle ?? null,
      property_slug: propertySlug ?? null,
      page_path: window.location.pathname,
      origin_detail: document.referrer || null,
      message: propertyTitle
        ? `Clique no WhatsApp para o imóvel ${propertyTitle}`
        : "Clique no WhatsApp",
    };

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/leads",
        new Blob([body], { type: "application/json" })
      );
      return;
    }

    void fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={trackLead}
      className={className}
    >
      <Image
        src="/social/whatsapp.png"
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        className="mr-2 h-5 w-5 shrink-0 object-contain"
      />
      {label}
    </a>
  );
}
