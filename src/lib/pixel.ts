export const META_PIXEL_ID = "1364220332085091";

type FbqFn = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown };

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

/** Injects the Meta Pixel base code once, on the client only. */
export function initMetaPixel() {
  if (typeof window === "undefined" || window.fbq) return;

  const fbq: FbqFn = function (...args: unknown[]) {
    if (fbq.callMethod) {
      (fbq.callMethod as (...a: unknown[]) => void).apply(fbq, args);
    } else {
      fbq.queue!.push(args);
    }
  } as FbqFn;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
}

/** Fires a standard Meta Pixel event. Safe to call anywhere. */
export function pixelTrack(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  const { eventID, ...rest } = (data ?? {}) as Record<string, unknown> & { eventID?: string };
  if (eventID) window.fbq("track", event, rest, { eventID });
  else window.fbq("track", event, rest);
}

