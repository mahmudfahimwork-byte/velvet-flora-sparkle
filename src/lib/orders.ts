export type OrderItem = { name: string; qty: number; price: number; slug: string };

export type Order = {
  id: string;
  order_code: string;
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  source?: string;
  created_at: string;
  sheet_synced_at?: string | null;
};

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_TONE: Record<string, string> = {
  new: "bg-primary/15 text-primary",
  confirmed: "bg-accent/20 text-accent-foreground",
  shipped: "bg-secondary text-secondary-foreground",
  delivered: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};
