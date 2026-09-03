import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { track } from "@/lib/track";

import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { categoryLabel, taka, type Product } from "@/lib/shop";
import { ProductCard } from "@/components/site/ProductCard";
import { SmartImage } from "@/components/site/SmartImage";
import { productsQuery } from "@/lib/queries";
import { CompleteTheLook } from "@/components/site/CompleteTheLook";
import { useRecommendations } from "@/lib/recommend";


export const Route = createFileRoute("/product/$slug")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  head: ({ params }) => {
    const title = `${params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — Velvet Flora`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            "Delicate jewellery from Velvet Flora with cash on delivery across Bangladesh. Order in a minute.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Order this piece with cash on delivery anywhere in Bangladesh.",
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const initial = Route.useLoaderData();
  const { data: products, isLoading } = useQuery({ ...productsQuery, initialData: initial });
  const product = (products ?? []).find((p) => p.slug === slug) ?? null;

  const related = useRecommendations(product, 3);

  useEffect(() => {
    if (!product) return;
    track("ViewContent", {
      content_name: product.name,
      content_ids: [product.slug],
      content_type: "product",
      content_category: product.category,
      value: product.price,
      currency: "BDT",
    });
  }, [product]);




  if (isLoading) {
    return <p className="mx-auto max-w-6xl px-5 py-20 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h1 className="text-3xl">Piece not found</h1>
        <Link to="/shop" className="mt-4 inline-block text-sm underline">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Link to="/shop" className="eyebrow hover:text-foreground">
        ← Back to shop
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductGallery product={product} />

        <div>
          <p className="eyebrow">{categoryLabel(product.category)}</p>
          <h1 className="mt-2 text-4xl">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold text-primary">{taka(product.price)}</p>
          <div className="gold-rule my-6" />
          <p className="text-muted-foreground">{product.description}</p>

          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>· Cash on delivery available</li>
            <li>· Delivery charge ৳60 inside Dhaka, ৳120 outside</li>
            <li>· Delivered within 2–4 days</li>
          </ul>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border">
              <button
                className="px-4 py-2 text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button
                className="px-4 py-2 text-lg"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={() => {
                add(product, qty);
                track("AddToCart", {
                  content_name: product.name,
                  content_ids: [product.slug],
                  content_type: "product",
                  value: product.price * qty,
                  currency: "BDT",
                });
                toast.success(`${product.name} added to your bag`);
              }}
              className="rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary"
            >
              Add to bag
            </button>
            <button
              onClick={() => {
                add(product, qty);
                track("AddToCart", {
                  content_name: product.name,
                  content_ids: [product.slug],
                  content_type: "product",
                  value: product.price * qty,
                  currency: "BDT",
                });
                navigate({ to: "/cart" });
              }}

              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Order now
            </button>
          </div>
        </div>
      </div>

      <CompleteTheLook product={product} picks={related} />

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-2 text-2xl">Customers also bought</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Ranked by what actually sells alongside this piece.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {related.map((p: Product) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function ProductGallery({ product }: { product: Product }) {
  const gallery = (() => {
    const list = (product.images ?? []).filter(Boolean);
    if (list.length) return list;
    return product.image_url ? [product.image_url] : [];
  })();
  const [active, setActive] = useState(0);
  const current = gallery[Math.min(active, gallery.length - 1)] ?? product.image_url;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
        <SmartImage
          src={current}
          fetchPriority="high"
          alt={product.name}
          width={900}
          height={900}
          className="size-full object-cover"
        />
      </div>
      {gallery.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {gallery.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              className={`overflow-hidden rounded-lg border transition-colors ${
                i === active ? "border-primary" : "border-border hover:border-foreground/30"
              }`}
            >
              <SmartImage
                src={url}
                alt={`${product.name} photo ${i + 1}`}
                loading="lazy"
                width={200}
                height={200}
                className="aspect-square size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
