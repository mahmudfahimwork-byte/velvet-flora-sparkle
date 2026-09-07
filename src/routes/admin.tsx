import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSheetSetting, saveSheetSetting, syncOrdersToSheet } from "@/lib/sheets.functions";
import { taka } from "@/lib/shop";
import type { Order } from "@/lib/orders";
import { ManualOrderCard } from "@/components/admin/ManualOrderCard";
import { MetricsPanel } from "@/components/admin/MetricsPanel";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { VisitorsPanel } from "@/components/admin/VisitorsPanel";
import { ReviewsPanel } from "@/components/admin/ReviewsPanel";
import { BundlePanel } from "@/components/admin/BundlePanel";

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

  return <Dashboard />;
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
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted-foreground underline">
          Sign out
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Reviews" },
  { key: "visitors", label: "Visitors" },
  { key: "settings", label: "Settings" },
] as const;

function Dashboard() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);

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
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setProductCount(count ?? 0));
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

  const newCount = orders.filter((o) => o.status === "new").length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1 className="mt-2 text-4xl">Velvet Flora control</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {newCount} new · {orders.length} total orders. New orders appear here instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">
            Refresh
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="gold-rule my-6" />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-5 py-2 text-sm transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <MetricsPanel orders={orders} productCount={productCount} />}
      {tab === "orders" && (
        <div className="space-y-4">
          <ManualOrderCard onAdded={(o) => setOrders((prev) => [o, ...prev])} />
          <OrdersPanel orders={orders} loading={loading} onChange={setOrders} />
        </div>
      )}
      {tab === "products" && <ProductsPanel onCountChange={setProductCount} />}
      {tab === "reviews" && <ReviewsPanel />}
      {tab === "visitors" && <VisitorsPanel />}
      {tab === "settings" && (
        <div className="space-y-4">
          <SheetSyncCard orderCount={orders.length} />
          <BundlePanel />
        </div>
      )}
    </div>
  );
}

function SheetSyncCard({ orderCount }: { orderCount: number }) {
  const readSetting = useServerFn(getSheetSetting);
  const saveSetting = useServerFn(saveSheetSetting);
  const syncNow = useServerFn(syncOrdersToSheet);

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{
    rows: number;
    statusesPulled: number;
    unknownCodes: string[];
  } | null>(null);

  useEffect(() => {
    readSetting({})
      .then((r) => setSheetId(r.spreadsheetId || null))
      .catch(() => setSheetId(null));
  }, [readSetting]);

  const runSync = useCallback(
    async (silent: boolean) => {
      try {
        const r = await syncNow({});
        if (!r.configured) return;
        setReport({ rows: r.rows, statusesPulled: r.statusesPulled, unknownCodes: r.unknownCodes });
        if (!silent) {
          toast.success(
            `Sheet rebuilt — ${r.rows} order(s), ${r.statusesPulled} status change(s) pulled from the sheet`,
          );
          if (r.unknownCodes.length) {
            toast.warning(
              `${r.unknownCodes.length} row(s) in the sheet aren't in the store: ${r.unknownCodes.join(", ")}`,
            );
          }
        }
      } catch (e) {
        if (!silent) toast.error(e instanceof Error ? e.message : "Sync failed");
      }
    },
    [syncNow],
  );

  useEffect(() => {
    if (sheetId) void runSync(true);
  }, [sheetId, orderCount, runSync]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await saveSetting({ data: { sheetUrl: url } });
      setSheetId(r.spreadsheetId);
      setUrl("");
      toast.success("Google Sheet connected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect that sheet");
    }
    setBusy(false);
  }

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <p className="font-display text-xl">Google Sheet</p>
      {sheetId ? (
        <div className="mt-2 space-y-3 text-sm text-muted-foreground">
          <p>
            Every sync rebuilds the sheet from the store: one row per order, no duplicates, a
            Channel column for Website / Messenger, and a live summary at the bottom. Statuses you
            edit in the sheet are pulled back into the store first.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Open sheet
            </a>
            <button onClick={() => runSync(false)} className="underline">
              Sync now
            </button>
            <button onClick={() => setSheetId(null)} className="underline">
              Change sheet
            </button>
          </div>
          {report && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p>
                Sheet holds <strong>{report.rows}</strong> order row(s) — matching the store exactly.
                {report.statusesPulled > 0 && ` ${report.statusesPulled} status change(s) pulled from the sheet.`}
              </p>
              {report.unknownCodes.length > 0 ? (
                <p className="mt-1 text-destructive">
                  Mismatch: {report.unknownCodes.join(", ")} exist in the sheet but not in the store
                  (kept under “Needs attention” at the bottom of the sheet).
                </p>
              ) : (
                <p className="mt-1 text-emerald-700">No mismatches.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={save} className="mt-3 flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your Google Sheet link"
            className="min-w-64 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        </form>
      )}
    </div>
  );
}
