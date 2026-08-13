import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY, taka, type AreaKey } from "@/lib/shop";
import type { Order } from "@/lib/orders";

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return `VF-M${out}`;
}

export function ManualOrderCard({ onAdded }: { onAdded: (order: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    area: "inside_dhaka" as AreaKey,
    items: "",
    subtotal: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const fee = DELIVERY[form.area].fee;
  const subtotal = Number(form.subtotal || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.phone || !form.address || !subtotal) {
      toast.error("Name, phone, address and amount are required");
      return;
    }
    setBusy(true);
    const payload = {
      order_code: code(),
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      area: form.area,
      notes: form.notes.trim(),
      items: [{ name: form.items.trim() || "Messenger order", qty: 1, price: subtotal, slug: "messenger" }],
      subtotal,
      delivery_fee: fee,
      discount: 0,
      total: subtotal + fee,
      status: "new",
      source: "messenger",
    };
    const { data, error } = await supabase.from("orders").insert(payload as never).select().maybeSingle();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not save that order");
      return;
    }
    onAdded(data as unknown as Order);
    toast.success("Messenger order added — sync to push it to the sheet");
    setForm({ customer_name: "", phone: "", address: "", area: "inside_dhaka", items: "", subtotal: "", notes: "" });
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl">Messenger order</p>
          <p className="text-sm text-muted-foreground">
            Add orders you took on Messenger so they land in the same sheet.
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
        >
          {open ? "Close" : "Add order"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="Customer name"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="Phone"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Full address"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={form.area}
            onChange={(e) => set("area", e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {Object.entries(DELIVERY).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label} · {taka(v.fee)}
              </option>
            ))}
          </select>
          <input
            value={form.subtotal}
            onChange={(e) => set("subtotal", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Product amount (৳)"
            inputMode="numeric"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={form.items}
            onChange={(e) => set("items", e.target.value)}
            placeholder="Items (e.g. Pearl bracelet x1, Anklet x1)"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Notes (optional)"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-sm text-muted-foreground">
              Delivery {taka(fee)} · Total {taka(subtotal + fee)}
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save order"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
