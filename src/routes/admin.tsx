import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSheetSetting, saveSheetSetting, syncOrdersToSheet } from "@/lib/sheets.functions";
import { DELIVERY, taka, type AreaKey } from "@/lib/shop";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Orders Dashboard — Velvet Flora" },
      { name: "description", content: "Private order dashboard for Velvet Flora." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Orders Dashboard — Velvet Flora" },
      { property: "og:description", content: "Private order dashboard." },
    ],
  }),
  component: AdminPage,
});

type OrderItem = { name: string; qty: number; price: number; slug: string };
type Order = {
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
  created_at: string;
};

const STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"] as const;

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkRole = useCallback(async () => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  }, [session]);

  useEffect(() => {
    void checkRole();
  }, [checkRole]);

  if (!ready) return <Shell>Loading…</Shell>;
  if (!session) return <AuthCard />;
  if (isAdmin === null) return <Shell>Checking access…</Shell>;
  if (!isAdmin) return <ClaimCard onClaimed={checkRole} />;

  return <OrdersDashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-5 py-24 text-center text-sm text-muted-foreground">{children}</div>;
}

function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "signin" ? "Welcome back" : "Account created");
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow">Store owner</p>
      <h1 className="mt-2 text-3xl">{mode === "signin" ? "Sign in" : "Create your admin account"}</h1>
      <div className="gold-rule my-5" />
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-xs text-muted-foreground underline"
        >
          {mode === "signin" ? "First time? Create your account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function ClaimCard({ onClaimed }: { onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_first_admin");
    setBusy(false);
    if (error || !data) {
      toast.error("An owner account already exists for this store.");
      return;
    }
    toast.success("You're the store owner now");
    onClaimed();
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="text-3xl">Not an owner yet</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        If this is your store, claim owner access once. After that no other account can claim it.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={claim}
          disabled={busy}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Claim owner access
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-muted-foreground underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as unknown as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as unknown as Order;
        setOrders((prev) => [order, ...prev]);
        toast.success(`New order ${order.order_code} · ${taka(order.total)}`, {
          description: `${order.customer_name} — ${order.phone}`,
          duration: 15000,
        });
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch {
          /* audio not available */
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update the order");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  const newCount = orders.filter((o) => o.status === "new").length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="mt-2 text-4xl">Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {newCount} new · {orders.length} total. New orders appear here instantly.
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
        >
          Sign out
        </button>
      </div>
      <div className="gold-rule my-6" />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl">{o.order_code}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("en-GB")}
                  </p>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm capitalize"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="text-sm">
                  <p className="font-semibold">{o.customer_name}</p>
                  <p className="text-muted-foreground">{o.phone}</p>
                  <p className="mt-1 text-muted-foreground">{o.address}</p>
                  <p className="mt-1 text-muted-foreground">
                    {DELIVERY[o.area as AreaKey]?.label ?? o.area}
                  </p>
                  {o.notes && <p className="mt-1 italic text-muted-foreground">“{o.notes}”</p>}
                </div>
                <div className="text-sm">
                  <ul className="space-y-1">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>
                          {it.name} × {it.qty}
                        </span>
                        <span>{taka(it.price * it.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 border-t border-border pt-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery</span>
                      <span>{taka(o.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total (COD)</span>
                      <span>{taka(o.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
