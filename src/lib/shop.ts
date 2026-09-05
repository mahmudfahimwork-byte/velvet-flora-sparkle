export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  images?: string[] | null;
  in_stock: boolean;
  featured: boolean;
  sort_order?: number;
};

export const CATEGORIES = [
  { key: "bracelet", label: "Bracelets" },
  { key: "pendant", label: "Pendants" },
  { key: "anklet", label: "Anklets" },
] as const;

export const DELIVERY = {
  inside_dhaka: { label: "Inside Dhaka", fee: 60 },
  outside_dhaka: { label: "Outside Dhaka", fee: 120 },
} as const;

export type AreaKey = keyof typeof DELIVERY;

/** "Complete the look": 3 or more different pieces in one order get 10% off. */
export const BUNDLE = { minPieces: 3, percent: 10 } as const;

export function bundleDiscount(distinctCount: number, subtotal: number) {
  if (distinctCount < BUNDLE.minPieces) return 0;
  return Math.round((subtotal * BUNDLE.percent) / 100);
}

export function taka(amount: number) {
  return `৳${amount.toLocaleString("en-US")}`;
}


export function categoryLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
