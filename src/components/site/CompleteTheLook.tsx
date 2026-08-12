import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SmartImage } from "@/components/site/SmartImage";
import { useCart } from "@/lib/cart";
import { BUNDLE, bundleDiscount, taka, type Product } from "@/lib/shop";

export function CompleteTheLook({ product, picks }: { product: Product; picks: Product[] }) {
  const { add } = useCart();
  const set = [product, ...picks].slice(0, BUNDLE.minPieces);
  if (set.length < BUNDLE.minPieces) return null;

  const subtotal = set.reduce((s, p) => s + p.price, 0);
  const saving = bundleDiscount(set.length, subtotal);

  return (
    <section className="mt-16 rounded-2xl border border-primary/40 bg-primary/5 p-6">
      <p className="eyebrow">Complete the look</p>
      <h2 className="mt-1 font-display text-2xl">
        Style all three and save {BUNDLE.percent}%
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Chosen from what customers most often buy together with this piece.
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
          <span className="text-muted-foreground line-through">{taka(subtotal)}</span>{" "}
          <span className="text-base font-semibold">{taka(subtotal - saving)}</span>
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
            save {taka(saving)}
          </span>
        </div>
        <button
          onClick={() => {
            set.forEach((p) => add(p, 1));
            toast.success(`Look added — ${BUNDLE.percent}% off applied in your bag`);
          }}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Add the full look
        </button>
      </div>
    </section>
  );
}
