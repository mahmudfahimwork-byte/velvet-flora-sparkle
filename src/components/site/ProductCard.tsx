import { Link } from "@tanstack/react-router";
import { SmartImage } from "@/components/site/SmartImage";
import { categoryLabel, taka, type Product } from "@/lib/shop";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {!product.in_stock && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground">
            Sold out
          </span>
        )}
        <SmartImage
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          width={900}
          height={900}
          className={`size-full object-cover transition-transform duration-700 group-hover:scale-105 ${product.in_stock ? "" : "opacity-60 grayscale"}`}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="eyebrow">{categoryLabel(product.category)}</span>
        <h3 className="font-display text-lg leading-snug">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-semibold">{taka(product.price)}</span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
