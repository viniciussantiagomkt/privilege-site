"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", name, payload);
  window.fbq?.("trackCustom", name, payload);
  window.clarity?.("event", name);
}
