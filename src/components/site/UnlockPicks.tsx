import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/site/SmartImage";
import { useCart } from "@/lib/cart";
import { useCartRecommendations } from "@/lib/recommend";
import { taka } from "@/lib/shop";
import { useBundle } from "@/lib/bundle";

/**
 * Compact quick-add row shown next to the "add N more piece" nudge in the
 * checkout summary — relevant pieces, one tap to add.
 */
export function UnlockPicks() {
  const { lines, add, subtotal } = useCart();
  const picks = useCartRecommendations(
    lines.map((l) => l.slug),
    3,
  );
  const bundle = useBundle();
  if (!picks.length || !bundle.enabled) return null;

  const distinct = lines.length;
  const currentSaving = bundle.discount(distinct, subtotal);

  return (
    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-medium text-primary">Quick add to unlock {bundle.percent}% off</p>
      <div className="mt-2 space-y-2">
        {picks.map((p) => {
          const extra = Math.max(
            0,
            bundle.discount(distinct + 1, subtotal + p.price) - currentSaving,
          );
          return (
            <div key={p.id} className="flex items-center gap-2">
              <SmartImage
                src={p.image_url}
                alt={p.name}
                loading="lazy"
                width={120}
                height={120}
                className="size-10 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {taka(p.price)}
                  {extra > 0 ? ` · save ${taka(extra)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  add(p, 1);
                  toast.success(`${p.name} added to your bag`);
                }}
                aria-label={`Quick add ${p.name}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="size-3" /> Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
