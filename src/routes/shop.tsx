import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/site/ProductCard";
import { productsQuery } from "@/lib/queries";
import { CATEGORIES } from "@/lib/shop";

type ShopSearch = { category?: string | undefined };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search['category'] === "string" ? search['category'] : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: () => ({
    meta: [
      { title: "Shop Bracelets, Pendants & Anklets — Velvet Flora" },
      {
        name: "description",
        content:
          "Browse every Velvet Flora piece: bracelets, pendants and anklets from ৳500 to ৳1000 with cash on delivery.",
      },
      { property: "og:title", content: "Shop — Velvet Flora" },
      {
        property: "og:description",
        content: "Dainty bracelets, pendants and anklets from ৳500. Cash on delivery in Bangladesh.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { category } = Route.useSearch();

  const initial = Route.useLoaderData();
  const { data, isLoading } = useQuery({ ...productsQuery, initialData: initial });

  const products = (data ?? []).filter((p) => !category || p.category === category);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="eyebrow">The collection</p>
      <h1 className="mt-2 text-4xl">Shop all</h1>
      <div className="gold-rule my-5" />

      <div className="mb-10 flex flex-wrap gap-2">
        <Link
          to="/shop"
          search={{}}
          className={`rounded-full border px-5 py-2 text-sm transition-colors ${
            !category ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            to="/shop"
            search={{ category: c.key }}
            className={`rounded-full border px-5 py-2 text-sm transition-colors ${
              category === c.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pieces…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet — check back soon.</p>
      ) : category ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="space-y-14">
          {CATEGORIES.map((c) => {
            const items = products.filter((p) => p.category === c.key);
            if (items.length === 0) return null;
            return (
              <section key={c.key} id={c.key}>
                <h2 className="mb-1 text-2xl">{c.label}</h2>
                <p className="mb-5 text-sm text-muted-foreground">{items.length} piece(s)</p>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                  {items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            );
          })}
          {products.filter((p) => !CATEGORIES.some((c) => c.key === p.category)).length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl">More pieces</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {products
                  .filter((p) => !CATEGORIES.some((c) => c.key === p.category))
                  .map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
