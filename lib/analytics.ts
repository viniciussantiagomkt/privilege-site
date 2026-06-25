"use client";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsPayload = Record<string, AnalyticsValue>;
type DataLayerEvent = AnalyticsPayload & {
  event: string;
  event_id?: string;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    clarity?: (...args: unknown[]) => void;
  }
}

export function createAnalyticsEventId(prefix = "evt") {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomId}`;
}

export function pushDataLayer(eventData: DataLayerEvent) {
  if (typeof window === "undefined") return null;

  const payload = {
    event_id: eventData.event_id || createAnalyticsEventId(eventData.event),
    page_url: window.location.href,
    ...eventData,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (process.env.NODE_ENV === "development") {
    console.log("Analytics Event:", payload);
  }

  return payload.event_id;
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  return pushDataLayer({
    event: name,
    ...payload,
  });
}

export function trackWhatsAppLead(payload: AnalyticsPayload = {}) {
  return trackEvent("whatsapp_lead", {
    lead_type: "whatsapp",
    ...payload,
  });
}
