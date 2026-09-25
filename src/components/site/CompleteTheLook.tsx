import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SmartImage } from "@/components/site/SmartImage";
import { useCart } from "@/lib/cart";
import { taka, type Product } from "@/lib/shop";
import { useBundle } from "@/lib/bundle";
import { productsQuery } from "@/lib/queries";

// Seeded shuffle so the "random" picks are stable per product (no hydration mismatch).
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function CompleteTheLook({ product, picks }: { product: Product; picks: Product[] }) {
  const { add } = useCart();
  const bundle = useBundle();
  const { data: all } = useQuery(productsQuery);
  const chosenSlugs = (product.look_slugs ?? []).filter(Boolean);
  const manual = chosenSlugs.length > 0;

  let set: Product[];
  if (manual) {
    const bySlug = new Map((all ?? []).map((p) => [p.slug, p]));
    const chosen = chosenSlugs.map((s) => bySlug.get(s)).filter((p): p is Product => !!p && p.in_stock);
    // Show the product itself plus a random selection from the hand-picked pieces.
    const othersNeeded = Math.max(bundle.minPieces - 1, 1);
    const randomPicks = chosen.length > othersNeeded
      ? seededShuffle(chosen, product.slug).slice(0, othersNeeded)
      : chosen;
    set = product.in_stock ? [product, ...randomPicks] : randomPicks;
    if (!bundle.enabled || set.length < 2) return null;
  } else {
    const pool = [product, ...picks].filter((p) => p.in_stock);
    set = pool.slice(0, bundle.minPieces);
    if (!bundle.enabled || set.length < bundle.minPieces) return null;
  }

  const subtotal = set.reduce((s, p) => s + p.price, 0);
  const saving = bundle.discount(set.length, subtotal);

  return (
    <section className="mt-16 rounded-2xl border border-primary/40 bg-primary/5 p-6">
      <p className="eyebrow">Complete the look</p>
      <h2 className="mt-1 font-display text-2xl">
        {saving > 0 ? `Style all ${set.length} and save ${bundle.percent}%` : `Style all ${set.length} together`}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {manual ? "Hand-picked to go with this piece." : "Chosen from what customers most often buy together with this piece."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {set.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            {i > 0 && <span className="text-lg text-muted-foreground">+</span>}
            <Link
              to="/product/$slug"
              params={{ slug: p.slug }}
              className="flex w-32 flex-col gap-1"
            >
              <SmartImage
                src={p.image_url}
                alt={p.name}
                loading="lazy"
                width={300}
                height={300}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <span className="line-clamp-1 text-xs">{p.name}</span>
              <span className="text-xs font-semibold">{taka(p.price)}</span>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="text-sm">
          {saving > 0 && <span className="text-muted-foreground line-through">{taka(subtotal)}</span>}{" "}
          <span className="text-base font-semibold">{taka(subtotal - saving)}</span>
          {saving > 0 && (
            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              save {taka(saving)}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            set.forEach((p) => add(p, 1));
            toast.success(saving > 0 ? `Look added — ${bundle.percent}% off applied in your bag` : "Look added to your bag");
          }}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Add the full look
        </button>
      </div>
    </section>
  );
}
