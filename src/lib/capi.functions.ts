import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { sendServerEvent } from "./capi.server";

const schema = z.object({
  eventName: z.enum([
    "PageView",
    "ViewContent",
    "AddToCart",
    "InitiateCheckout",
    "Purchase",
    "Contact",
  ]),
  eventId: z.string().min(4).max(64),
  eventSourceUrl: z.string().url().optional(),
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(120).optional(),
  customerName: z.string().max(120).optional(),
  city: z.string().max(60).optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
});

/** Mirrors a browser pixel event to Meta's Conversions API (deduped by event_id). */
export const trackServerEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const ip =
      getRequestHeader("cf-connecting-ip") ?? forwarded.split(",")[0]?.trim() ?? undefined;

    const [firstName, ...rest] = (data.customerName ?? "").trim().split(/\s+/).filter(Boolean);

    return sendServerEvent({
      eventName: data.eventName,
      eventId: data.eventId,
      eventSourceUrl: data.eventSourceUrl,
      customData: data.customData,
      user: {
        phone: data.phone,
        email: data.email,
        firstName,
        lastName: rest.length ? rest.join(" ") : undefined,
        city: data.city,
        country: "bd",
        fbp: data.fbp,
        fbc: data.fbc,
        ip: ip || undefined,
        userAgent: getRequestHeader("user-agent") ?? undefined,
      },
    });
  });
