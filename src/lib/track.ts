import { pixelTrack } from "./pixel";
import { trackServerEvent } from "./capi.functions";

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

/** Valid fbc: fb.1.<ms timestamp>.<fbclid>, kept exactly as Meta wrote it. */
function validFbc(v: string | undefined) {
  return v && /^fb\.\d\.\d{10,}\.[A-Za-z0-9_-]+$/.test(v) ? v : undefined;
}

/** Prefers Meta's own _fbc cookie; otherwise builds one once from the landing URL. */
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
 * Meta Test Events code. Open any page with ?test_code=TEST12345 and every
 * server event in that browser tab is shown live in Events Manager → Test events.
 * Real customers never have it, so their events go to production.
 */
function getTestCode() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("test_code");
    if (fromUrl && /^TEST\w{1,20}$/i.test(fromUrl)) {
      sessionStorage.setItem("vf_test_code", fromUrl.toUpperCase());
    }
    return sessionStorage.getItem("vf_test_code") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fires one conversion through both the browser pixel and the server-side
 * Conversions API, sharing an event_id so Meta deduplicates them.
 * Values are sent in native BDT (Meta supports BDT).
 */
export function track(
  eventName: EventName,
  customData: Record<string, unknown> = {},
  identity: Identity = {},
) {
  if (typeof window === "undefined") return;
  const eventId = newEventId();
  const data: Record<string, unknown> = { ...customData };
  if (data["value"] !== undefined) data["value"] = Number(data["value"]) || 0;

  pixelTrack(eventName, { ...data, eventID: eventId });

  void trackServerEvent({
    data: {
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      fbp: readCookie("_fbp"),
      fbc: getFbc(),
      testEventCode: getTestCode(),
      customData: data,
      ...identity,
    },
  }).catch((err) => {
    console.warn("Server tracking failed", err);
  });
}
