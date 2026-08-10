import { useMemo } from "react";
import { taka } from "@/lib/shop";
import type { Order } from "@/lib/orders";
import { ORDER_STATUSES } from "@/lib/orders";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MetricsPanel({ orders, productCount }: { orders: Order[]; productCount: number }) {
  const m = useMemo(() => {
    const paid = orders.filter((o) => o.status !== "cancelled");
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const delivered = orders.filter((o) => o.status === "delivered");
    const now = Date.now();
    const days = (o: Order, n: number) => now - new Date(o.created_at).getTime() < n * 86400000;
    const today = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString());
    const week = orders.filter((o) => days(o, 7));

    const counts = Object.fromEntries(
      ORDER_STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]),
    ) as Record<string, number>;

    const productTally = new Map<string, { qty: number; revenue: number }>();
    for (const o of paid) {
      for (const it of o.items ?? []) {
        const cur = productTally.get(it.name) ?? { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price;
        productTally.set(it.name, cur);
      }
    }
    const topProducts = [...productTally.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5);

    const inside = orders.filter((o) => o.area === "inside_dhaka").length;

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString("en-GB", { weekday: "short" });
      const dayOrders = orders.filter(
        (o) => new Date(o.created_at).toDateString() === d.toDateString(),
      );
      return { label, count: dayOrders.length, total: dayOrders.reduce((s, o) => s + o.total, 0) };
    });

    return {
      revenue,
      delivered: delivered.length,
      deliveredRevenue: delivered.reduce((s, o) => s + o.total, 0),
      aov: paid.length ? Math.round(revenue / paid.length) : 0,
      today: today.length,
      todayRevenue: today.reduce((s, o) => s + o.total, 0),
      week: week.length,
      counts,
      topProducts,
      inside,
      outside: orders.length - inside,
      last7,
      cancelRate: orders.length ? Math.round((counts['cancelled']! / orders.length) * 100) : 0,
    };
  }, [orders]);

  const peak = Math.max(1, ...m.last7.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total orders" value={String(orders.length)} hint={`${m.week} in the last 7 days`} />
        <Stat label="Revenue (excl. cancelled)" value={taka(m.revenue)} hint={`${taka(m.deliveredRevenue)} delivered`} />
        <Stat label="Average order" value={taka(m.aov)} hint={`${productCount} products live`} />
        <Stat label="Today" value={`${m.today}`} hint={taka(m.todayRevenue)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ORDER_STATUSES.map((s) => (
          <div key={s} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs capitalize text-muted-foreground">{s}</p>
            <p className="mt-1 font-display text-2xl">{m.counts[s]}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-display text-xl">Last 7 days</p>
          <div className="mt-4 flex h-36 items-end gap-2">
            {m.last7.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{d.count || ""}</span>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${(d.count / peak) * 100}%`, minHeight: d.count ? 6 : 2 }}
                  title={`${d.count} orders · ${taka(d.total)}`}
                />
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-display text-xl">Best sellers</p>
          {m.topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {m.topProducts.map(([name, v]) => (
                <li key={name} className="flex items-center justify-between gap-3">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {v.qty} sold · {taka(v.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="gold-rule my-4" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Inside Dhaka: {m.inside}</span>
            <span>Outside: {m.outside}</span>
            <span>Cancel rate: {m.cancelRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
