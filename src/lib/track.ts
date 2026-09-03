import { pixelTrack } from "./pixel";
import { trackServerEvent } from "./capi.functions";

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function newEventId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type EventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Contact";

type Identity = { phone?: string; email?: string; customerName?: string; city?: string };

/**
 * Fires one conversion through both the browser pixel and the server-side
 * Conversions API, sharing an event_id so Meta deduplicates them.
 */
export function track(
  eventName: EventName,
  customData: Record<string, unknown> = {},
  identity: Identity = {},
) {
  if (typeof window === "undefined") return;
  const eventId = newEventId();

  pixelTrack(eventName, { ...customData, eventID: eventId });

  void trackServerEvent({
    data: {
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc") ?? fbcFromUrl(),
      customData,
      ...identity,
    },
  }).catch(() => {
    /* tracking must never break the page */
  });
}

/** Builds an fbc value from the ad click id when Meta's cookie isn't set yet. */
function fbcFromUrl() {
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
}
