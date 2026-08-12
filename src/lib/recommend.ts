import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery } from "./queries";
import type { Product } from "./shop";

type ScoreRow = { slug: string; score: number };

async function fetchBoughtTogether(slug: string) {
  const { data, error } = await supabase.rpc("bought_together", { _slug: slug, _limit: 8 });
  if (error) throw error;
  return (data ?? []) as ScoreRow[];
}

async function fetchPopular() {
  const { data, error } = await supabase.rpc("popular_products", { _limit: 12 });
  if (error) throw error;
  return (data ?? []) as ScoreRow[];
}

/**
 * Ranks products for a given piece using real purchase behaviour:
 * 1. pieces most often bought in the same order (co-purchase metric)
 * 2. best sellers overall, favouring a *different* category for variety
 * 3. anything else, so the shelf is never empty
 */
export function useRecommendations(product: Product | null | undefined, limit = 3) {
  const slug = product?.slug ?? "";

  const { data: products } = useQuery({ ...productsQuery, select: (rows) => rows.filter((p) => p.in_stock) });
  const { data: together } = useQuery({
    queryKey: ["reco", "together", slug],
    queryFn: () => fetchBoughtTogether(slug),
    staleTime: 10 * 60_000,
    enabled: !!slug,
  });
  const { data: popular } = useQuery({ queryKey: ["reco", "popular"], queryFn: fetchPopular, staleTime: 10 * 60_000 });

  if (!product || !products) return [] as Product[];

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const picked: Product[] = [];
  const push = (p?: Product) => {
    if (p && p.slug !== product.slug && !picked.some((x) => x.slug === p.slug)) picked.push(p);
  };

  for (const row of together ?? []) push(bySlug.get(row.slug));

  const popularProducts = (popular ?? []).map((r) => bySlug.get(r.slug)).filter(Boolean) as Product[];
  for (const p of popularProducts) if (p.category !== product.category) push(p);
  for (const p of popularProducts) push(p);

  const others = products.filter((p) => p.category !== product.category);
  for (const p of others) push(p);
  for (const p of products) push(p);

  return picked.slice(0, limit);
}

/** One smart add-on for the bag, ranked against everything already in it. */
export function useCartRecommendation(cartSlugs: string[]) {
  const { data: products } = useQuery({ ...productsQuery, select: (rows) => rows.filter((p) => p.in_stock) });
  const { data: popular } = useQuery({ queryKey: ["reco", "popular"], queryFn: fetchPopular, staleTime: 10 * 60_000 });
  const anchor = cartSlugs[0] ?? "";
  const { data: together } = useQuery({
    queryKey: ["reco", "together", anchor],
    queryFn: () => fetchBoughtTogether(anchor),
    enabled: !!anchor,
  });

  if (!products?.length) return null;

  const inCart = new Set(cartSlugs);
  const candidates = products.filter((p) => !inCart.has(p.slug));
  if (!candidates.length) return null;

  const bySlug = new Map(candidates.map((p) => [p.slug, p]));

  for (const row of together ?? []) {
    const hit = bySlug.get(row.slug);
    if (hit) return hit;
  }
  for (const row of popular ?? []) {
    const hit = bySlug.get(row.slug);
    if (hit) return hit;
  }
  return candidates[0] ?? null;
}
