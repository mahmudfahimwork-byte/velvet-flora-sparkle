import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Visit = {
  id: string;
  visitor_id: string;
  session_id: string;
  path: string;
  page_title: string;
  referrer: string;
  source: string;
  campaign: string;
  device: string;
  browser: string;
  country: string;
  city: string;
  is_new_visitor: boolean;
  created_at: string;
};

function since(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function countBy(rows: Visit[], pick: (v: Visit) => string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) || "unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function VisitorsPanel() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("site_visits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      setVisits((data ?? []) as Visit[]);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(
    () => visits.filter((v) => new Date(v.created_at).getTime() >= since(range)),
    [visits, range],
  );

  const uniqueVisitors = new Set(rows.map((v) => v.visitor_id)).size;
  const sessions = new Set(rows.map((v) => v.session_id)).size;
  const newVisitors = new Set(rows.filter((v) => v.is_new_visitor).map((v) => v.visitor_id)).size;
  const todayViews = visits.filter(
    (v) => new Date(v.created_at).toDateString() === new Date().toDateString(),
  ).length;

  if (loading) return <p className="text-sm text-muted-foreground">Loading visitors…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[1, 7, 30].map((d) => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              range === d ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
            }`}
          >
            {d === 1 ? "Today" : `Last ${d} days`}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Visitors" value={uniqueVisitors} />
        <Stat label="Visits" value={sessions} />
        <Stat label="Page views" value={rows.length} />
        <Stat label="First-time visitors" value={newVisitors} />
      </div>
      <p className="text-xs text-muted-foreground">{todayViews} page view(s) so far today.</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Where they come from" items={countBy(rows, (v) => v.source)} />
        <ListCard title="Most visited pages" items={countBy(rows, (v) => v.path)} />
        <ListCard title="Device" items={countBy(rows, (v) => v.device)} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="font-display text-xl">Latest visitors</p>
        <div className="mt-3 space-y-2 text-sm">
          {rows.slice(0, 25).map((v) => (
            <div key={v.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
              <span>
                {v.path}
                <span className="ml-2 text-xs text-muted-foreground">
                  {v.source} · {v.device} · {v.browser}
                  {v.country ? ` · ${v.country}` : ""}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(v.created_at).toLocaleString("en-GB")} · {v.is_new_visitor ? "new" : "returning"}
              </span>
            </div>
          ))}
          {rows.length === 0 && <p className="text-muted-foreground">No visits recorded in this period yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: [string, number][] }) {
  const top = items.slice(0, 6);
  const max = top[0]?.[1] ?? 1;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-display text-xl">{title}</p>
      <div className="mt-3 space-y-2">
        {top.map(([k, n]) => (
          <div key={k}>
            <div className="flex justify-between text-sm">
              <span className="truncate pr-2">{k}</span>
              <span className="text-muted-foreground">{n}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-secondary">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {top.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
    </div>
  );
}
