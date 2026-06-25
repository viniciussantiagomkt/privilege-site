"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackEvent, trackWhatsAppLead } from "@/lib/analytics";

type TrackingPayload = Record<string, string | number | boolean | null | undefined>;

type TrackedLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
  ariaLabel?: string;
  eventName?: string;
  eventPayload?: TrackingPayload;
  trackLead?: boolean;
};

export function TrackedLink({
  href,
  children,
  className,
  external = false,
  ariaLabel,
  eventName = "PrivilegeLinkClick",
  eventPayload = {},
  trackLead = false,
}: TrackedLinkProps) {
  function handleClick() {
    const payload = {
      destination: href,
      ...eventPayload,
    };

    if (trackLead) {
      trackWhatsAppLead({
        ...payload,
        property_id: eventPayload.property_id || null,
        property_title: eventPayload.property_title || null,
        property_price: eventPayload.property_price || null,
        broker_name: eventPayload.broker_name || null,
        button_location: eventPayload.button_location || "links_hub",
      });
      return;
    }

    trackEvent(eventName, payload);
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
