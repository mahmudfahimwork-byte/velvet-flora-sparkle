import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/site/SmartImage";
import { useCart } from "@/lib/cart";
import { useCartRecommendation } from "@/lib/recommend";
import { BUNDLE, bundleDiscount, taka } from "@/lib/shop";

export function CartUpsell() {
  const { lines, add, subtotal } = useCart();
  const pick = useCartRecommendation(lines.map((l) => l.slug));
  if (!pick || !lines.length) return null;

  const distinct = lines.length;
  const currentSaving = bundleDiscount(distinct, subtotal);
  const nextSaving = bundleDiscount(distinct + 1, subtotal + pick.price);
  const extraSaving = Math.max(0, nextSaving - currentSaving);

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="eyebrow">Goes well with your bag</p>
      <div className="mt-3 flex items-center gap-3">
        <SmartImage
          src={pick.image_url}
          alt={pick.name}
          loading="lazy"
          width={200}
          height={200}
          className="size-16 rounded-lg object-cover"
        />
        <div className="flex-1">
          <p className="font-display text-base leading-tight">{pick.name}</p>
          <p className="text-sm text-muted-foreground">{taka(pick.price)}</p>
          {extraSaving > 0 ? (
            <p className="mt-1 text-xs text-primary">
              Add this and unlock {BUNDLE.percent}% off — you save {taka(extraSaving)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Most customers pair this with what you picked
            </p>
          )}
        </div>
        <button
          onClick={() => {
            add(pick, 1);
            toast.success(`${pick.name} added to your bag`);
          }}
          aria-label={`Quick add ${pick.name}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>
    </div>
  );
}
