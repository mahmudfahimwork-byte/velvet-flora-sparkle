import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Delivery — Velvet Flora" },
      {
        name: "description",
        content:
          "How to reach Velvet Flora, delivery charges inside and outside Dhaka, and cash on delivery details.",
      },
      { property: "og:title", content: "Contact & Delivery — Velvet Flora" },
      {
        property: "og:description",
        content: "Delivery charges, timing and how to reach us about your order.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Contact & delivery</p>
      <h1 className="mt-2 text-4xl">We're a message away</h1>
      <div className="gold-rule my-6" />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl">Delivery charges</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Inside Dhaka — ৳60</li>
            <li>Outside Dhaka — ৳120</li>
            <li>Delivered within 2–4 working days</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl">Payment</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Cash on delivery all over Bangladesh</li>
            <li>Pay the courier when the parcel arrives</li>
            <li>No advance payment needed</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-6">
        <h2 className="font-display text-xl">Talk to us</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          For order updates, exchanges or a custom request, message us on WhatsApp or Facebook and
          we'll reply within a few hours. Add your contact details here once you're ready to share
          them publicly.
        </p>
      </div>
    </div>
  );
}
