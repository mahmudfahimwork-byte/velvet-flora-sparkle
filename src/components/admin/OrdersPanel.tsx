import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncOrderStatusToSheet } from "@/lib/sheets.functions";
import { DELIVERY, taka, type AreaKey } from "@/lib/shop";
import { ORDER_STATUSES, STATUS_TONE, type Order } from "@/lib/orders";

export function OrdersPanel({
  orders,
  loading,
  onChange,
}: {
  orders: Order[];
  loading: boolean;
  onChange: (updater: (prev: Order[]) => Order[]) => void;
}) {
  const pushStatus = useServerFn(syncOrderStatusToSheet);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return [o.order_code, o.customer_name, o.phone, o.address].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [orders, filter, query]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update the order");
      return;
    }
    const order = orders.find((o) => o.id === id);
    onChange((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (order) {
      try {
        const r = await pushStatus({ data: { orderCode: order.order_code, status } });
        if (r.configured && !r.updated) {
          toast.message("Status saved. That order isn't in your sheet yet — it will be added on the next sync.");
        }
      } catch {
        toast.error("Status saved, but the Google Sheet couldn't be updated.");
      }
    }
  }

  async function bulk(status: string) {
    const ids = visible.filter((o) => o.status !== status).map((o) => o.id);
    if (!ids.length) return;
    if (!confirm(`Mark ${ids.length} shown order(s) as ${status}?`)) return;
    for (const id of ids) await updateStatus(id, status);
    toast.success(`${ids.length} order(s) updated`);
  }

  function exportCsv() {
    const head = [
      "Order", "Date", "Customer", "Phone", "Address", "Area", "Items",
      "Subtotal", "Delivery", "Total", "Status", "Notes",
    ];
    const rows = visible.map((o) => [
      o.order_code,
      new Date(o.created_at).toLocaleString("en-GB"),
      o.customer_name,
      o.phone,
      o.address,
      DELIVERY[o.area as AreaKey]?.label ?? o.area,
      (o.items ?? []).map((i) => `${i.name} x${i.qty}`).join("; "),
      o.subtotal,
      o.delivery_fee,
      o.total,
      o.status,
      o.notes ?? "",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `velvet-flora-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, name, phone…"
          className="min-w-52 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={exportCsv} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
          Export CSV
        </button>
        <button onClick={() => bulk("confirmed")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
          Confirm shown
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {visible.length} of {orders.length} orders
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders match.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xl">{o.order_code}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${STATUS_TONE[o.status] ?? "bg-secondary"}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("en-GB")} · {taka(o.total)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setOpen(open === o.id ? null : o.id)}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
                  >
                    {open === o.id ? "Hide" : "Details"}
                  </button>
                </div>
              </div>

              {open === o.id && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="text-sm">
                    <p className="font-semibold">{o.customer_name}</p>
                    <a href={`tel:${o.phone}`} className="text-muted-foreground underline">{o.phone}</a>
                    <p className="mt-1 text-muted-foreground">{o.address}</p>
                    <p className="mt-1 text-muted-foreground">
                      {DELIVERY[o.area as AreaKey]?.label ?? o.area}
                    </p>
                    {o.notes && <p className="mt-1 italic text-muted-foreground">“{o.notes}”</p>}
                    <a
                      href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "88 0".replace(" ", ""))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs underline"
                    >
                      Message on WhatsApp
                    </a>
                  </div>
                  <div className="text-sm">
                    <ul className="space-y-1">
                      {(o.items ?? []).map((it, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{it.name} × {it.qty}</span>
                          <span>{taka(it.price * it.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 border-t border-border pt-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span><span>{taka(o.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Delivery</span><span>{taka(o.delivery_fee)}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total (COD)</span><span>{taka(o.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
