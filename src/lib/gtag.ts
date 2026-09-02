export const GA_MEASUREMENT_ID = "G-4DZN7R0LEM";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Injects the Google Analytics (gtag.js) snippet once, on the client only. */
export function initGtag() {
  if (typeof window === "undefined" || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  const gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
}

/** Sends a page_view for SPA route changes. */
export function gtagPageView(path: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
