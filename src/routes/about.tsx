import { createFileRoute, Link } from "@tanstack/react-router";
import { useText } from "@/lib/content";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story — Velvet Flora Jewellery" },
      {
        name: "description",
        content:
          "Velvet Flora is a small Bangladeshi jewellery label making soft, wearable bracelets, pendants and anklets.",
      },
      { property: "og:title", content: "Our Story — Velvet Flora" },
      {
        property: "og:description",
        content: "A small Bangladeshi jewellery label built on soft, everyday pieces.",
      },
    ],
  }),
  component: About,
});

function About() {
  const t = useText();
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">{t("about.eyebrow")}</p>
      <h1 className="mt-2 text-4xl">{t("about.title")}</h1>
      <div className="gold-rule my-6" />
      <div className="space-y-5 text-muted-foreground">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
      </div>
      <Link
        to="/shop"
        className="mt-10 inline-block rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t("about.cta")}
      </Link>
    </div>
  );
}
