import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { BUNDLE, DELIVERY, bundleDiscount, taka, type AreaKey } from "@/lib/shop";
import { CartUpsell } from "@/components/site/CartUpsell";
import { UnlockPicks } from "@/components/site/UnlockPicks";



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

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Enter a valid 11-digit Bangladeshi number (e.g. 01712345678)"),
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

  const discount = bundleDiscount(lines.length, subtotal);
  const deliveryFee = lines.length ? DELIVERY[area].fee : 0;
  const total = subtotal - discount + deliveryFee;


  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;

    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const orderCode = `VF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { error } = await supabase.from("orders").insert({
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

    setSubmitting(false);

    if (error) {
      toast.error("Could not place your order. Please try again.");
      return;
    }

    pixelTrack("Purchase", {
      value: total,
      currency: "BDT",
      content_type: "product",
      content_ids: lines.map((l) => l.slug),
      num_items: lines.reduce((n, l) => n + l.qty, 0),
      order_id: orderCode,
    });

    clear();
    navigate({ to: "/order-confirmed", search: { code: orderCode } });

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-2 text-4xl">Your bag</h1>
      <div className="gold-rule my-6" />

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex gap-4 rounded-xl border border-border bg-card p-4"
            >
              <img
                src={l.image_url}
                alt={l.name}
                loading="lazy"
                width={900}
                height={900}
                className="size-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-display text-lg">{l.name}</p>
                <p className="text-sm text-muted-foreground">{taka(l.price)} each</p>
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

        <form onSubmit={placeOrder} className="rounded-xl border border-border bg-card p-6">

          <h2 className="font-display text-2xl">Delivery details</h2>

          <div className="mt-5 space-y-4">
            <Field
              label="Full name"
              value={form.customer_name}
              onChange={(v) => setForm({ ...form, customer_name: v })}
              error={errors['customer_name']}
              placeholder="Your name"
            />
            <Field
              label="Phone number"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              error={errors['phone']}
              placeholder="01XXXXXXXXX"
            />
            <div>
              <label className="text-sm">Full address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                placeholder="House, road, area, city"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                <span>Complete the look ({BUNDLE.percent}% off)</span>
                <span>−{taka(discount)}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Add {BUNDLE.minPieces - lines.length} more piece
                  {BUNDLE.minPieces - lines.length > 1 ? "s" : ""} to get {BUNDLE.percent}% off your look.
                </p>
                <UnlockPicks />
              </>
            )}

            <Row label={`Delivery (${DELIVERY[area].label})`} value={taka(deliveryFee)} />

            <div className="flex justify-between pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{taka(total)}</span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              Cash on delivery — pay the courier when your parcel arrives.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Placing order…" : `Confirm order · ${taka(total)}`}
          </button>
        </form>
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
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
