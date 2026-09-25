import { createFileRoute } from "@tanstack/react-router";
import { useText } from "@/lib/content";

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
  const t = useText();
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">{t("contact.eyebrow")}</p>
      <h1 className="mt-2 text-4xl">{t("contact.title")}</h1>
      <div className="gold-rule my-6" />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl">{t("contact.delivery.title")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{t("contact.delivery.l1")}</li>
            <li>{t("contact.delivery.l2")}</li>
            <li>{t("contact.delivery.l3")}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl">{t("contact.payment.title")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{t("contact.payment.l1")}</li>
            <li>{t("contact.payment.l2")}</li>
            <li>{t("contact.payment.l3")}</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-secondary/50 p-6">
        <h2 className="font-display text-xl">{t("contact.talk.title")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("contact.talk.text")}</p>
      </div>
    </div>
  );
}
