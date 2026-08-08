import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { categoryLabel, taka, type Product } from "@/lib/shop";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/product/$slug")({
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

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["products", "related", product?.category, product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", product!.category)
        .neq("id", product!.id)
        .limit(3);
      if (error) throw error;
      return data as Product[];
    },
  });

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
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <img
            src={product.image_url}
            alt={product.name}
            width={900}
            height={900}
            className="size-full object-cover"
          />
        </div>

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
                toast.success(`${product.name} added to your bag`);
              }}
              className="rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary"
            >
              Add to bag
            </button>
            <button
              onClick={() => {
                add(product, qty);
                navigate({ to: "/cart" });
              }}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Order now
            </button>
          </div>
        </div>
      </div>

      {related && related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-6 text-2xl">You may also like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
