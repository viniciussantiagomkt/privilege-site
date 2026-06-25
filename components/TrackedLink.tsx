"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackEvent, trackMetaEvent } from "@/lib/analytics";

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

    trackEvent(eventName, payload);

    if (trackLead) {
      trackMetaEvent("Lead", {
        content_name: eventPayload.label || "Atendimento Privilege",
        content_category: "Central Digital",
        source: eventPayload.source || "links",
      });
    }
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
