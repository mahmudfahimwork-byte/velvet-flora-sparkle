import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "./SmartImage";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  image_url: string;
  product_slug: string;
};

export function ProductReviews({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["reviews", slug],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, author_name, rating, body, image_url, product_slug")
        .eq("visible", true)
        .in("product_slug", ["", slug])
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const reviews = data ?? [];
  if (reviews.length === 0) return null;

  return (
    <section className="mt-20">
      <h2 className="mb-2 text-2xl">What customers say</h2>
      <p className="mb-6 text-sm text-muted-foreground">Real words and photos from our buyers.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <article key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            {r.image_url && (
              <SmartImage
                src={r.image_url}
                alt={`Review by ${r.author_name || "a customer"}`}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            )}
            <div className="p-4">
              <p className="text-primary" aria-label={`${r.rating} out of 5`}>
                {"★".repeat(Math.max(1, Math.min(5, r.rating)))}
              </p>
              {r.body && <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>}
              {r.author_name && <p className="mt-3 text-sm font-medium">— {r.author_name}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
