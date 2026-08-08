export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
  in_stock: boolean;
  featured: boolean;
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

export function taka(amount: number) {
  return `৳${amount.toLocaleString("en-US")}`;
}

export function categoryLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
