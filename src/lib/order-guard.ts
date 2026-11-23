export const ORDER_COOLDOWN_MS = 60 * 60 * 1000;

const DEVICE_UNTIL_KEY = "vf-order-device-until";
const PHONE_PREFIX = "vf-order-phone-until:";
const PHONE_SALT_KEY = "vf-order-phone-salt";

export type OrderCooldownKind = "device" | "phone" | null;

export function orderCooldownKind(deviceUntil: number, phoneUntil: number, now: number): OrderCooldownKind {
  if (phoneUntil > now) return "phone";
  if (deviceUntil > now) return "device";
  return null;
}

export function isLikelyFakeBdPhone(raw: string): boolean {
  const digits = raw.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/\D/g, "");
  const normalized = digits.startsWith("880") ? `0${digits.slice(3)}` : digits.length === 10 && digits.startsWith("1") ? `0${digits}` : digits;
  if (!/^01[3-9]\d{8}$/.test(normalized)) return false;

  const tail = normalized.slice(-8);
  return /^(\d)\1{7}$/.test(tail) || [
    "12345678", "23456789", "34567890", "45678901", "56789012",
    "67890123", "78901234", "89012345", "90123456", "98765432",
    "87654321", "76543210", "65432109", "54321098", "43210987",
    "32109876", "21098765",
  ].includes(tail);
}

async function phoneStorageKey(phone: string): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    let salt = localStorage.getItem(PHONE_SALT_KEY);
    if (!salt) {
      salt = globalThis.crypto.randomUUID();
      localStorage.setItem(PHONE_SALT_KEY, salt);
    }
    const normalized = phone.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/\D/g, "");
    const bytes = new TextEncoder().encode(`${salt}:${normalized}`);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${PHONE_PREFIX}${hex}`;
  } catch {
    return null;
  }
}

export async function checkOrderGuard(phone: string): Promise<string | null> {
  if (isLikelyFakeBdPhone(phone)) {
    return "এই নম্বরটি পরীক্ষামূলক মনে হচ্ছে। সচল মোবাইল নম্বর দিন।";
  }

  try {
    const phoneKey = await phoneStorageKey(phone);
    const phoneUntil = phoneKey ? Number(localStorage.getItem(phoneKey) ?? 0) : 0;
    const deviceUntil = Number(localStorage.getItem(DEVICE_UNTIL_KEY) ?? 0);
    const kind = orderCooldownKind(deviceUntil, phoneUntil, Date.now());
    if (kind === "phone") return "এই নম্বরে গত ১ ঘণ্টার মধ্যে অর্ডার করা হয়েছে। আমাদের প্রতিনিধি যোগাযোগ করবেন।";
    if (kind === "device") return "এই ব্রাউজার থেকে গত ১ ঘণ্টার মধ্যে অর্ডার করা হয়েছে। আমাদের প্রতিনিধি যোগাযোগ করবেন।";
  } catch {
    return null;
  }

  return null;
}

export async function markOrderPlaced(phone: string): Promise<void> {
  try {
    const expiresAt = Date.now() + ORDER_COOLDOWN_MS;
    localStorage.setItem(DEVICE_UNTIL_KEY, String(expiresAt));
    const phoneKey = await phoneStorageKey(phone);
    if (phoneKey) localStorage.setItem(phoneKey, String(expiresAt));
  } catch {
    // Browser storage can be disabled; in that case this local cooldown cannot be recorded.
  }
}

export function getOrderErrorMessage(error: unknown, fallback: string): string {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "";
  if (message.includes("ORDER_PHONE_COOLDOWN")) {
    return "এই নম্বরে গত ১ ঘণ্টার মধ্যে অর্ডার করা হয়েছে। আমাদের প্রতিনিধি যোগাযোগ করবেন।";
  }
  if (message.includes("ORDER_DEVICE_COOLDOWN")) {
    return "এই ব্রাউজার থেকে গত ১ ঘণ্টার মধ্যে অর্ডার করা হয়েছে। আমাদের প্রতিনিধি যোগাযোগ করবেন।";
  }
  if (message.includes("ORDER_FAKE_PHONE")) {
    return "এই নম্বরটি পরীক্ষামূলক মনে হচ্ছে। সচল মোবাইল নম্বর দিন।";
  }
  return fallback;
}