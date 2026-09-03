import { recordVisit } from "./visits.functions";

const VISITOR_KEY = "vf_visitor_id";
const SESSION_KEY = "vf_session_id";

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Sends one page view to our own analytics table. Fire-and-forget. */
export function logPageView() {
  if (typeof window === "undefined") return;
  try {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    const isNewVisitor = !visitorId;
    if (!visitorId) {
      visitorId = randomId();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = randomId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    const params = new URLSearchParams(window.location.search);
    const campaign =
      params.get("utm_campaign") ?? params.get("utm_source") ?? (params.get("fbclid") ? "facebook_ads" : "");

    void recordVisit({
      data: {
        visitorId,
        sessionId,
        path: window.location.pathname,
        pageTitle: document.title.slice(0, 200),
        referrer: document.referrer || "",
        campaign,
        isNewVisitor,
      },
    }).catch(() => {
      /* analytics must never break the page */
    });
  } catch {
    /* storage unavailable */
  }
}
