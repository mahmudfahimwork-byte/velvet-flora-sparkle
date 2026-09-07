import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncOrderStatusToSheet } from "@/lib/sheets.functions";
import { DELIVERY, taka, type AreaKey } from "@/lib/shop";
import { ORDER_STATUSES, STATUS_TONE, type Order, type OrderItem } from "@/lib/orders";

type Draft = {
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
  items: OrderItem[];
  delivery_fee: string;
  discount: string;
};

function toDraft(o: Order): Draft {
  return {
    customer_name: o.customer_name ?? "",
    phone: o.phone ?? "",
    address: o.address ?? "",
    area: o.area ?? "inside_dhaka",
    notes: o.notes ?? "",
    items: (o.items ?? []).map((i) => ({ ...i })),
    delivery_fee: String(o.delivery_fee ?? 0),
    discount: String(o.discount ?? 0),
  };
}

function num(v: string | number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(o: Order) {
    setOpen(o.id);
    setEditing(o.id);
    setDraft(toDraft(o));
  }

  function setField<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }

  function setItem(idx: number, patch: Partial<OrderItem>) {
    setDraft((d) =>
      d ? { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : d,
    );
  }

  function addItem() {
    setDraft((d) => (d ? { ...d, items: [...d.items, { name: "", qty: 1, price: 0, slug: "" }] } : d));
  }

  function removeItem(idx: number) {
    setDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d));
  }

  const draftSubtotal = draft
    ? draft.items.reduce((s, i) => s + num(i.price) * num(i.qty), 0)
    : 0;
  const draftTotal = draft
    ? Math.max(0, draftSubtotal + num(draft.delivery_fee) - num(draft.discount))
    : 0;

  async function saveEdit(o: Order) {
    if (!draft) return;
    if (!draft.customer_name.trim() || !draft.phone.trim() || !draft.address.trim()) {
      toast.error("Name, phone and address can't be empty");
      return;
    }
    setSaving(true);
    const patch = {
      customer_name: draft.customer_name.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      area: draft.area,
      notes: draft.notes,
      items: draft.items.map((i) => ({
        name: i.name.trim(),
        qty: Math.max(1, num(i.qty)),
        price: Math.max(0, num(i.price)),
        slug: i.slug ?? "",
      })),
      subtotal: draftSubtotal,
      delivery_fee: num(draft.delivery_fee),
      discount: num(draft.discount),
      total: draftTotal,
    };
    const { error } = await supabase.from("orders").update(patch as never).eq("id", o.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save those changes");
      return;
    }
    onChange((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    setEditing(null);
    setDraft(null);
    toast.success(`${o.order_code} updated — run a sheet sync to push it`);
  }


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

  async function removeOrder(o: Order) {
    if (!confirm(`Delete order ${o.order_code}? This cannot be undone.`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    if (error) {
      toast.error("Could not delete that order");
      return;
    }
    onChange((prev) => prev.filter((x) => x.id !== o.id));
    toast.success(`${o.order_code} deleted`);
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
                    onClick={() => updateStatus(o.id, "confirmed")}
                    className="rounded-full border border-border px-3 py-2 text-xs hover:bg-secondary"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(o.id, "hold")}
                    className="rounded-full border border-border px-3 py-2 text-xs text-amber-700 hover:bg-secondary"
                  >
                    Hold
                  </button>
                  <button
                    onClick={() => updateStatus(o.id, "delivered")}
                    className="rounded-full border border-border px-3 py-2 text-xs text-emerald-700 hover:bg-secondary"
                  >
                    Delivered
                  </button>
                  <button
                    onClick={() => void removeOrder(o)}
                    className="rounded-full border border-border px-3 py-2 text-xs text-destructive hover:bg-secondary"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => (editing === o.id ? (setEditing(null), setDraft(null)) : startEdit(o))}
                    className="rounded-full border border-border px-3 py-2 text-xs hover:bg-secondary"
                  >
                    {editing === o.id ? "Cancel edit" : "Edit"}
                  </button>
                  <button
                    onClick={() => setOpen(open === o.id ? null : o.id)}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
                  >
                    {open === o.id ? "Hide" : "Details"}
                  </button>
                </div>
              </div>

              {editing === o.id && draft && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.customer_name}
                    onChange={(e) => setField("customer_name", e.target.value)}
                    placeholder="Customer name"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="Phone"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.address}
                    onChange={(e) => setField("address", e.target.value)}
                    placeholder="Full address"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
                  />
                  <select
                    value={draft.area}
                    onChange={(e) => {
                      const area = e.target.value;
                      setDraft((d) =>
                        d
                          ? { ...d, area, delivery_fee: String(DELIVERY[area as AreaKey]?.fee ?? num(d.delivery_fee)) }
                          : d,
                      );
                    }}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(DELIVERY).map(([key, v]) => (
                      <option key={key} value={key}>
                        {v.label} · {taka(v.fee)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={draft.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Notes"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />

                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-sm font-semibold">Items</p>
                    {draft.items.map((it, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <input
                          value={it.name}
                          onChange={(e) => setItem(i, { name: e.target.value })}
                          placeholder="Item name"
                          className="min-w-40 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                          value={String(it.qty)}
                          onChange={(e) => setItem(i, { qty: num(e.target.value.replace(/[^\d]/g, "")) })}
                          inputMode="numeric"
                          placeholder="Qty"
                          className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                        <input
                          value={String(it.price)}
                          onChange={(e) => setItem(i, { price: num(e.target.value.replace(/[^\d]/g, "")) })}
                          inputMode="numeric"
                          placeholder="Unit price ৳"
                          className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() => removeItem(i)}
                          className="rounded-full border border-border px-3 py-2 text-xs text-destructive hover:bg-secondary"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addItem}
                      className="rounded-full border border-border px-4 py-2 text-xs hover:bg-secondary"
                    >
                      + Add item
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Delivery ৳</label>
                    <input
                      value={draft.delivery_fee}
                      onChange={(e) => setField("delivery_fee", e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <label className="text-sm text-muted-foreground">Discount ৳</label>
                    <input
                      value={draft.discount}
                      onChange={(e) => setField("discount", e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Subtotal {taka(draftSubtotal)} · Total {taka(draftTotal)}
                    </p>
                    <button
                      onClick={() => void saveEdit(o)}
                      disabled={saving}
                      className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              )}

              {open === o.id && editing !== o.id && (
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
