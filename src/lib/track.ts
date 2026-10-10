import { pixelTrack } from "./pixel";
import { trackServerEvent } from "./capi.functions";

/**
 * Meta Pixel does not accept BDT (it is missing from the pixel's currency list,
 * so Purchase events with BDT are flagged invalid). Report values in USD instead.
 */
const BDT_PER_USD = 122;

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
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

type Identity = {
  phone?: string | undefined;
  email?: string | undefined;
  customerName?: string | undefined;
  city?: string | undefined;
};

function normalizeCurrency(data: Record<string, unknown>) {
  if (String(data["currency"] ?? "").toUpperCase() !== "BDT") return data;
  const bdt = Number(data["value"]);
  return {
    ...data,
    currency: "USD",
    value: Number.isFinite(bdt) ? Math.round((bdt / BDT_PER_USD) * 100) / 100 : 0,
    value_bdt: Number.isFinite(bdt) ? bdt : undefined,
  };
}

/** Valid fbc: fb.1.<ms timestamp>.<fbclid>, kept exactly as Meta wrote it. */
function validFbc(v: string | undefined) {
  return v && /^fb\.\d\.\d{10,}\.[A-Za-z0-9_-]+$/.test(v) ? v : undefined;
}

/**
 * Returns the click id. Prefers Meta's own _fbc cookie; otherwise builds one
 * once from the landing URL and stores it so every event reuses the same
 * timestamp (re-stamping per event is what Meta reports as a "modified" ClickID).
 */
function getFbc() {
  const cookie = validFbc(readCookie("_fbc"));
  if (cookie) return cookie;
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (fbclid && /^[A-Za-z0-9_-]+$/.test(fbclid)) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    document.cookie = `_fbc=${encodeURIComponent(fbc)}; path=/; max-age=${90 * 86400}; SameSite=Lax`;
    return fbc;
  }
  return undefined;
}

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
  const data = normalizeCurrency(customData);

  pixelTrack(eventName, { ...data, eventID: eventId });

  void trackServerEvent({
    data: {
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      fbp: readCookie("_fbp"),
      fbc: getFbc(),
      customData: data,
      ...identity,
    },
  }).catch(() => {
    /* tracking must never break the page */
  });
}
