import { createFileRoute, Link } from "@tanstack/react-router";
import { taka } from "@/lib/shop";
import { WHATSAPP_NUMBER, WhatsAppIcon } from "@/components/site/QuickOrder";

type Search = { code?: string | undefined; total?: number | undefined };

export const Route = createFileRoute("/order-confirmed")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const t = Number(search['total']);
    return {
      code: typeof search['code'] === "string" ? search['code'] : undefined,
      total: Number.isFinite(t) && t > 0 ? t : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Order Confirmed — Velvet Flora" },
      {
        name: "description",
        content: "Your Velvet Flora order is confirmed. We'll call you shortly to arrange delivery.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Order Confirmed — Velvet Flora" },
      { property: "og:description", content: "Thank you for ordering from Velvet Flora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  const { code, total } = Route.useSearch();
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi Velvet Flora! I just placed order ${code ?? ""}. `,
  )}`;

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="eyebrow">Thank you</p>
      <h1 className="mt-3 text-4xl">Your order is placed</h1>
      <div className="gold-rule mx-auto my-6" />
      <div className="rounded-xl border border-border bg-card p-5 text-sm">
        {code && (
          <p className="text-muted-foreground">
            Order number <span className="font-semibold text-foreground">{code}</span>
          </p>
        )}
        {total && (
          <p className="mt-2 text-base font-semibold">You pay on delivery: {taka(total)}</p>
        )}
      </div>
      <ol className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
        <li>1. We'll call you soon to confirm your order.</li>
        <li>2. Your parcel is packed and sent with the courier.</li>
        <li>3. Pay cash when it arrives — no advance needed.</li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Please don't place the same order again — we've got it.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-full border border-border px-7 py-3 text-sm font-medium hover:bg-secondary"
        >
          <WhatsAppIcon /> Questions? WhatsApp us
        </a>
        <Link
          to="/shop"
          className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
