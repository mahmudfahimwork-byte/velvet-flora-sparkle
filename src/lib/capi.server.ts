/** Meta Conversions API (server-side tracking). Server-only. */

const API_VERSION = "v21.0";

export type CapiUser = {
  phone?: string | undefined;
  email?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
  fbp?: string | undefined;
  fbc?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
};

export type CapiEvent = {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string | undefined;
  customData?: Record<string, unknown> | undefined;
  user: CapiUser;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

async function buildUserData(user: CapiUser) {
  const data: Record<string, unknown> = {};
  if (user.phone) data["ph"] = [await sha256(normalizePhone(user.phone))];
  if (user.email) data["em"] = [await sha256(user.email.trim().toLowerCase())];
  if (user.firstName) data["fn"] = [await sha256(user.firstName.trim().toLowerCase())];
  if (user.lastName) data["ln"] = [await sha256(user.lastName.trim().toLowerCase())];
  if (user.city) data["ct"] = [await sha256(user.city.trim().toLowerCase().replace(/\s/g, ""))];
  data["country"] = [await sha256((user.country ?? "bd").trim().toLowerCase())];
  if (user.fbp) data["fbp"] = user.fbp;
  if (user.fbc) data["fbc"] = user.fbc;
  if (user.ip) data["client_ip_address"] = user.ip;
  if (user.userAgent) data["client_user_agent"] = user.userAgent;
  return data;
}

/** Sends one event to Meta. Never throws — tracking must not break checkout. */
export async function sendServerEvent(event: CapiEvent): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env["META_PIXEL_ID"] ?? "1364220332085091";
  const token = process.env["META_CAPI_ACCESS_TOKEN"];
  if (!token) return { ok: false, error: "missing_token" };

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: "website",
        user_data: await buildUserData(event.user),
        custom_data: event.customData ?? {},
      },
    ],
    ...(process.env["META_CAPI_TEST_EVENT_CODE"]
      ? { test_event_code: process.env["META_CAPI_TEST_EVENT_CODE"] }
      : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error("Meta CAPI error", res.status, body.slice(0, 500));
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Meta CAPI request failed", err);
    return { ok: false, error: "request_failed" };
  }
}
