import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Banknote, PhoneCall, RefreshCw, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";

import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { DELIVERY, FREE_DELIVERY_MIN, taka, type AreaKey } from "@/lib/shop";
import { useBundle } from "@/lib/bundle";
import { useQuery } from "@tanstack/react-query";
import { productsQuery } from "@/lib/queries";
import { CartUpsell } from "@/components/site/CartUpsell";
import { UnlockPicks } from "@/components/site/UnlockPicks";
import { WhatsAppIcon, whatsappCartUrl } from "@/components/site/QuickOrder";
import { pixelTrack } from "@/lib/pixel";



export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag & Checkout — Velvet Flora" },
      {
        name: "description",
        content:
          "Review your Velvet Flora bag and place a cash-on-delivery order with delivery anywhere in Bangladesh.",
      },
      { property: "og:title", content: "Your Bag — Velvet Flora" },
      {
        property: "og:description",
        content: "Checkout with cash on delivery across Bangladesh.",
      },
    ],
  }),
  component: CartPage,
});

/** Accepts Bangla or English digits, spaces, dashes, +880 / 880 prefixes → 01XXXXXXXXX */
function normalizeBdPhone(raw: string): string {
  const en = raw.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  let digits = en.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(2);
  else if (digits.startsWith("88") && digits.length === 13) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
  return digits;
}

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z
    .string()
    .transform(normalizeBdPhone)
    .pipe(
      z
        .string()
        .regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন — Enter a valid number (e.g. 01712345678 / ০১৭১২৩৪৫৬৭৮)"),
    ),
  address: z.string().trim().min(10, "Please write your full delivery address").max(400),
  notes: z.string().trim().max(300).optional(),
});

function CartPage() {
  const { lines, subtotal, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const [area, setArea] = useState<AreaKey>("inside_dhaka");
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [trap, setTrap] = useState("");
  const submitLock = useRef(false);

  const bundle = useBundle();
  const { data: catalog } = useQuery(productsQuery);
  const soldOutSlugs = new Set(
    (catalog ?? []).filter((p) => !p.in_stock).map((p) => p.slug),
  );
  const soldOutLines = lines.filter((l) => soldOutSlugs.has(l.slug));
  const freeDelivery = lines.length > 0 && subtotal >= FREE_DELIVERY_MIN;
  // Free delivery and the bundle discount never stack — free delivery wins.
  const discount = freeDelivery ? 0 : bundle.discount(lines.length, subtotal);
  const deliveryFee = !lines.length || freeDelivery ? 0 : DELIVERY[area].fee;
  const total = subtotal - discount + deliveryFee;
  const awayFromFree = Math.max(0, FREE_DELIVERY_MIN - subtotal);

  const hasLines = lines.length > 0;
  useEffect(() => {
    if (hasLines) track("InitiateCheckout", { currency: "BDT", value: subtotal });
  }, [hasLines]);


  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;
    if (soldOutLines.length) {
      toast.error(
        `${soldOutLines.map((l) => l.name).join(", ")} is sold out — please remove it to continue.`,
      );
      return;
    }

    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      const first = ["customer_name", "phone", "address"].find((k) => next[k]);
      if (first) {
        toast.error(next[first]);
        const el = document.getElementById(`field-${first}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => el.focus({ preventScroll: true }), 350);
        }
      }
      return;
    }
    setErrors({});

    // Bot filled the hidden trap — pretend success, save nothing.
    if (trap) {
      navigate({ to: "/order-confirmed", search: { code: "VF-RECEIVED" } });
      return;
    }
    if (submitting || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setFailed(false);

    const orderCode = `VF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    let error: unknown = null;
    try {
      const res = await supabase.from("orders").insert({
        order_code: orderCode,
        customer_name: parsed.data.customer_name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        notes: parsed.data.notes ?? "",
        area,
        items: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price, slug: l.slug })),
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        total,
      });
      error = res.error;
    } catch (err) {
      error = err;
    }

    setSubmitting(false);

    if (error) {
      submitLock.current = false;
      setFailed(true);
      toast.error("Order didn't go through — finish it on WhatsApp in one tap.");
      return;
    }

    track(
      "Purchase",
      {
        value: total,
        currency: "BDT",
        content_type: "product",
        content_ids: lines.map((l) => l.slug),
        num_items: lines.reduce((n, l) => n + l.qty, 0),
        order_id: orderCode,
      },
      {
        phone: parsed.data.phone,
        customerName: parsed.data.customer_name,
        city: area === "inside_dhaka" ? "dhaka" : undefined,
      },
    );

    clear();
    navigate({ to: "/order-confirmed", search: { code: orderCode, total } });

  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="text-3xl">Your bag is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add a piece you love and it'll show up here.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-block rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_MIN) * 100));

  return (
    <div className="mx-auto max-w-6xl px-5 pb-32 pt-14 lg:pb-14">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-2 text-4xl">Your bag</h1>
      <div className="gold-rule my-6" />

      {/* Animated free-delivery progress */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm">
          <Truck className={`size-4 shrink-0 text-primary ${freeDelivery ? "animate-bounce" : ""}`} />
          {freeDelivery ? (
            <p className="font-medium text-primary">🎉 You've unlocked FREE delivery across Bangladesh!</p>
          ) : (
            <p className="text-muted-foreground">
              Add <span className="font-semibold text-foreground">{taka(awayFromFree)}</span> more to get{" "}
              <span className="font-semibold text-primary">FREE delivery</span>
            </p>
          )}
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={`progress-shimmer relative h-full rounded-full transition-[width] duration-700 ease-out ${freeDelivery ? "progress-glow" : ""}`}
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex gap-4 rounded-xl border border-border bg-card p-4"
            >
              <img
                src={cdnImage(l.image_url)}
                alt={l.name}
                loading="lazy"
                width={900}
                height={900}
                className="size-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-display text-lg">{l.name}</p>
                <p className="text-sm text-muted-foreground">{taka(l.price)} each</p>
                {soldOutSlugs.has(l.slug) && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    Sold out — please remove this to place your order
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-border text-sm">
                    <button className="px-3 py-1" onClick={() => setQty(l.id, l.qty - 1)}>
                      −
                    </button>
                    <span className="w-6 text-center">{l.qty}</span>
                    <button className="px-3 py-1" onClick={() => setQty(l.id, l.qty + 1)}>
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(l.id)}
                    className="text-xs text-muted-foreground underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold">{taka(l.price * l.qty)}</p>
            </div>
          ))}

          <CartUpsell />
        </div>

        <form id="checkout-form" noValidate onSubmit={placeOrder} className="rounded-xl border border-border bg-card p-6">
          {/* Invisible bot trap — humans never see or reach this field */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label>
              Company website
              <input
                type="text"
                name="company_website"
                tabIndex={-1}
                autoComplete="off"
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
              />
            </label>
          </div>


          <h2 className="font-display text-2xl">Delivery details</h2>

          <div className="mt-5 space-y-4">
            <Field
              id="field-customer_name"
              label="Full name"
              value={form.customer_name}
              onChange={(v) => setForm({ ...form, customer_name: v })}
              error={errors['customer_name']}
              placeholder="Your name"
            />
            <Field
              id="field-phone"
              label="Phone number"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              error={errors['phone']}
              placeholder="01XXXXXXXXX বা ০১XXXXXXXXX"
              inputMode="tel"
            />
            {!errors['phone'] && /^01[3-9]\d{8}$/.test(normalizeBdPhone(form.phone)) && (
              <p className="-mt-2 text-xs text-primary">✓ {normalizeBdPhone(form.phone)}</p>
            )}
            <div>
              <label className="text-sm">Full address</label>
              <textarea
                id="field-address"
                aria-invalid={!!errors['address']}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                placeholder="House/road, area, thana, district (landmark if any)"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/40"
              />
              {errors['address'] && (
                <p className="mt-1 text-xs text-destructive">{errors['address']}</p>
              )}
            </div>

            <div>
              <label className="text-sm">Delivery area</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(DELIVERY) as AreaKey[]).map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setArea(key)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      area === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {DELIVERY[key].label} · {taka(DELIVERY[key].fee)}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Note (optional)"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              error={errors['notes']}
              placeholder="Anything we should know?"
            />
          </div>

          <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">


            <Row label="Subtotal" value={taka(subtotal)} />
            {discount > 0 ? (
              <div className="flex justify-between text-primary">
                <span>Complete the look ({bundle.percent}% off)</span>
                <span>−{taka(discount)}</span>
              </div>
            ) : (
              <>
                {!freeDelivery && bundle.enabled && bundle.minPieces > lines.length && (
                  <p className="text-xs text-muted-foreground">
                    Add {bundle.minPieces - lines.length} more piece
                    {bundle.minPieces - lines.length > 1 ? "s" : ""} to get {bundle.percent}% off your look.
                  </p>
                )}
                {!freeDelivery && <UnlockPicks />}
              </>
            )}

            {freeDelivery ? (
              <div className="flex justify-between text-primary">
                <span>Delivery ({DELIVERY[area].label})</span>
                <span className="font-medium">FREE</span>
              </div>
            ) : (
              <Row label={`Delivery (${DELIVERY[area].label})`} value={taka(deliveryFee)} />
            )}

            <div className="mt-2 rounded-lg bg-secondary px-4 py-3">
              <div className="flex items-center justify-between text-base font-semibold">
                <span>You pay on delivery</span>
                <span className="text-lg">{taka(total)}</span>
              </div>
              {discount > 0 && (
                <p className="mt-1 text-xs text-primary">You save {taka(discount)} on this order</p>
              )}
            </div>
          </div>

          <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] leading-tight text-muted-foreground">
            <li className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2">
              <Banknote className="size-4 text-primary" />Cash on Delivery
            </li>
            <li className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2">
              <PhoneCall className="size-4 text-primary" />We call before dispatch
            </li>
            <li className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2">
              <RefreshCw className="size-4 text-primary" />Easy exchange
            </li>
          </ul>

          {failed && (
            <div role="alert" className="mt-5 rounded-xl border border-primary/40 bg-secondary p-4 text-sm">
              <p className="font-medium">Your connection was slow, but your details are saved.</p>
              <p className="mt-1 text-muted-foreground">
                Tap the green button below to finish your order on WhatsApp in one tap.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || soldOutLines.length > 0}
            className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Placing order…" : `Confirm order · ${taka(total)}`}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            No advance payment needed. We'll call to confirm before dispatch.
          </p>
          <a
            href={whatsappCartUrl({
              lines: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
              discount,
              areaLabel: DELIVERY[area].label,
              deliveryFee,
              total,
              customer: {
                name: form.customer_name,
                phone: form.phone,
                address: form.address,
                notes: form.notes,
              },
            })}
            target="_blank"
            rel="noreferrer"
            onClick={() => pixelTrack("Contact", { value: total, currency: "BDT", num_items: lines.length })}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors ${
              failed
                ? "bg-[#25D366] text-white hover:opacity-90"
                : "border border-border hover:bg-secondary"
            }`}
          >
            <WhatsAppIcon />
            {failed ? "Complete order via WhatsApp" : "Need help? Order via WhatsApp"}
          </a>
        </form>
      </div>

      {/* Mobile sticky checkout bar — always within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lift backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">You pay on delivery</p>
            <p className="truncate text-lg font-semibold leading-tight">{taka(total)}</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={submitting || soldOutLines.length > 0}
            className="shrink-0 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-opacity disabled:opacity-60"
          >
            {submitting ? "Placing…" : "Confirm order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  placeholder?: string;
  inputMode?: "tel" | "text";
}) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/40"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
