import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/site/ProductCard";
import { SmartImage } from "@/components/site/SmartImage";
import { productsQuery } from "@/lib/queries";
import { contentQuery } from "@/lib/content";
import { CATEGORIES } from "@/lib/shop";
import { useText } from "@/lib/content";
import { useLandingPages } from "@/lib/landing";
import { cdnImage } from "@/components/site/SmartImage";
import comboHero from "@/assets/combo-hero.jpg";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(contentQuery);
    return context.queryClient.ensureQueryData(productsQuery).catch(() => undefined);
  },
  head: () => ({
    meta: [
      { title: "Velvet Flora — Kitchen, Home Decor & Gadgets in BD" },
      {
        name: "description",
        content:
          "Kitchen appliances, home decor and smart gadgets at honest prices. Cash on delivery all over Bangladesh.",
      },
      { property: "og:title", content: "Velvet Flora — Kitchen, Home Decor & Gadgets in BD" },
      {
        property: "og:description",
        content: "Kitchen appliances, home decor and smart gadgets at honest prices. Cash on delivery all over Bangladesh.",
      },
    ],
    links: [
      { rel: "preload", as: "image", href: "/images/hero.webp", type: "image/webp" },
    ],
  }),
  component: Index,
});

function Index() {
  const t = useText();
  const initial = Route.useLoaderData();
  const { data: products } = useQuery({ ...productsQuery, ...(initial ? { initialData: initial } : {}) });
  const featured = (products ?? []).filter((p) => p.featured);
  const { pages } = useLandingPages();
  const offers = pages.filter((p) => p.active && p.showOnHome);


  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <h1 className="mt-4 text-5xl leading-[1.05] md:text-6xl">
              {t("home.title1")}
              <span className="block italic text-primary">{t("home.title2")}</span>
            </h1>
            <div className="gold-rule my-6" />
            <p className="max-w-md text-muted-foreground">
              {t("home.intro")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("home.cta1")}
              </Link>
              <Link
                to="/about"
                className="rounded-full border border-border px-7 py-3 text-sm transition-colors hover:bg-secondary"
              >
                {t("home.cta2")}
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
            <SmartImage
              src="/images/hero.jpg"
              alt="Modern kitchen appliances, home decor and gadgets on a bright counter"
              width={1600}
              height={1008}
              fetchPriority="high"
              className="size-full object-cover"
            />
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              to="/shop"
              search={{ category: c.key }}
              className="rounded-xl border border-border bg-card px-6 py-8 text-center transition-colors hover:bg-secondary"
            >
              <span className="font-display text-2xl">{c.label}</span>
              <p className="eyebrow mt-2">Shop now</p>
            </Link>
          ))}
        </div>
      </section>

      {(
        <section className="mx-auto max-w-6xl px-5 pt-16">
          <div className="mb-6 text-center">
            <p className="eyebrow">Special offers</p>
            <h2 className="mt-2 text-3xl">Hot deals & combos</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/combo-offer"
              className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[var(--shadow-soft)]">
              <img src={t("combo.img.hero") ? cdnImage(t("combo.img.hero")) : comboHero} alt="Grinder + Multi Cooker combo" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-4">
                <p className="font-display text-xl">Grinder + Multi Cooker Combo</p>
                <p className="mt-1 font-semibold text-primary">Free delivery · Cash on delivery</p>
                <p className="eyebrow mt-2">View offer →</p>
              </div>
            </Link>
            {offers.map((o) => {
              const first = o.packages[0];
              const img = o.heroImage || first?.image;
              return (
                <Link key={o.slug} to="/offer/$slug" params={{ slug: o.slug }}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[var(--shadow-soft)]">
                  {img && <img src={cdnImage(img)} alt={o.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                  <div className="p-4">
                    <p className="font-display text-xl">{o.title} {o.highlight}</p>
                    {first && <p className="mt-1 font-semibold text-primary">From ৳{Math.min(...o.packages.map((k) => k.price)).toLocaleString("en-US")}</p>}
                    <p className="eyebrow mt-2">View offer →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 pt-20">
        <div className="mb-8 text-center">
          <p className="eyebrow">{t("home.featured.eyebrow")}</p>
          <h2 className="mt-2 text-3xl">{t("home.featured.title")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {(featured ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/shop"
            className="rounded-full border border-border px-7 py-3 text-sm transition-colors hover:bg-secondary"
          >
            {t("home.featured.cta")}
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-5">
        <div className="grid gap-6 rounded-2xl bg-secondary/60 p-10 sm:grid-cols-3">
          {[
            { t: t("home.promise1.title"), d: t("home.promise1.text") },
            { t: t("home.promise2.title"), d: t("home.promise2.text") },
            { t: t("home.promise3.title"), d: t("home.promise3.text") },
          ].map((f) => (
            <div key={f.t}>
              <h3 className="font-display text-xl">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
