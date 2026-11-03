"use client";

import Image from "next/image";

import { trackWhatsAppLead } from "@/lib/analytics";

interface WhatsAppLeadButtonProps {
  href: string;
  label?: string;
  propertyId?: number;
  propertyTitle?: string;
  propertySlug?: string;
  propertyPrice?: string | number | null;
  brokerName?: string | null;
  buttonLocation?: string;
  source?: string;
  className?: string;
}

export function WhatsAppLeadButton({
  href,
  label = "WhatsApp",
  propertyId,
  propertyTitle,
  propertySlug,
  propertyPrice,
  brokerName,
  buttonLocation,
  source = "whatsapp",
  className = "",
}: WhatsAppLeadButtonProps) {
  function trackLead() {
    // A click is an analytics interaction, not a person identified by the CRM.
    try {
      trackWhatsAppLead({
        source,
        interaction_type: "click",
        page_url: window.location.origin + window.location.pathname,
        property_id: propertyId ?? null,
        property_slug: propertySlug ?? null,
        property_title: propertyTitle ?? null,
        property_price: propertyPrice ?? null,
        broker_name: brokerName ?? null,
        button_location: buttonLocation || source,
      });
    } catch {
      // Tracking must never prevent the browser from opening WhatsApp.
    }
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
