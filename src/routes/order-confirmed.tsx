import { createFileRoute, Link } from "@tanstack/react-router";

type Search = { code?: string | undefined };

export const Route = createFileRoute("/order-confirmed")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    code: typeof search['code'] === "string" ? search['code'] : undefined,
  }),
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
    ],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  const { code } = Route.useSearch();

  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="eyebrow">Thank you</p>
      <h1 className="mt-3 text-4xl">Your order is placed</h1>
      <div className="gold-rule mx-auto my-6" />
      {code && (
        <p className="text-sm text-muted-foreground">
          Order number{" "}
          <span className="font-semibold text-foreground">{code}</span>
        </p>
      )}
      <p className="mt-4 text-muted-foreground">
        We'll call you on the number you gave us to confirm the details. Keep the cash ready for
        the courier when your parcel arrives.
      </p>
      <Link
        to="/shop"
        className="mt-10 inline-block rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Continue shopping
      </Link>
    </div>
  );
}
