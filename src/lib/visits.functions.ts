import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  visitorId: z.string().min(4).max(64),
  sessionId: z.string().min(4).max(64),
  path: z.string().max(300),
  pageTitle: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  campaign: z.string().max(120).optional(),
  isNewVisitor: z.boolean(),
});

/** Derives a readable traffic source from the referrer host. */
function sourceFrom(referrer: string, campaign: string) {
  if (campaign) return campaign.toLowerCase().includes("fb") ? "facebook_ads" : "campaign";
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("facebook") || host.includes("fb.")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("google")) return "google";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("youtube")) return "youtube";
    if (host.includes("messenger") || host.includes("l.facebook")) return "messenger";
    return host;
  } catch {
    return "direct";
  }
}

function deviceFrom(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function browserFrom(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Other";
}

/** Records one page view. Never throws — analytics must not break the page. */
export const recordVisit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    try {
      const ua = getRequestHeader("user-agent") ?? "";
      const referrer = data.referrer ?? "";
      const campaign = data.campaign ?? "";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      await supabaseAdmin.from("site_visits").insert({
        visitor_id: data.visitorId,
        session_id: data.sessionId,
        path: data.path,
        page_title: data.pageTitle ?? "",
        referrer,
        source: sourceFrom(referrer, campaign),
        campaign,
        device: deviceFrom(ua),
        browser: browserFrom(ua),
        country: getRequestHeader("cf-ipcountry") ?? "",
        city: getRequestHeader("cf-ipcity") ?? "",
        is_new_visitor: data.isNewVisitor,
      });
      return { ok: true };
    } catch (err) {
      console.error("recordVisit failed", err);
      return { ok: false };
    }
  });
