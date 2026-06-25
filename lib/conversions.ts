export function createConversionEventId(prefix = "srv") {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}_${randomId}`;
}

export type ConversionEventPayload = {
  event_name: string;
  event_id?: string;
  event_time?: number;
  event_source_url?: string;
  action_source?: "website";
  custom_data?: Record<string, unknown>;
  user_data?: Record<string, unknown>;
};

export function prepareConversionEvent(payload: ConversionEventPayload) {
  return {
    action_source: "website" as const,
    event_time: Math.floor(Date.now() / 1000),
    ...payload,
    event_id: payload.event_id || createConversionEventId(payload.event_name),
  };
}
