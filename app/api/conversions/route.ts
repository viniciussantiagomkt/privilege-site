import { NextResponse } from "next/server";

import { prepareConversionEvent } from "@/lib/conversions";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const event = prepareConversionEvent({
      event_name: body.event_name || body.event || "website_event",
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      custom_data: body.custom_data,
      user_data: body.user_data,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("Prepared Conversion API event:", event);
    }

    return NextResponse.json({
      ok: true,
      ready_for_capi: true,
      event_id: event.event_id,
      event,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_conversion_payload",
      },
      { status: 400 }
    );
  }
}
