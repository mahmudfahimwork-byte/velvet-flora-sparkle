import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { contentQuery } from "@/lib/content";
import { ImageField } from "@/components/admin/ContentPanel";
import {
  LANDING_KEY,
  newLandingPage,
  newPackage,
  parseLandingPages,
  slugify,
  type LandingPage,
  type LandingPackage,
} from "@/lib/landing";

const input =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function LandingPanel() {
  const qc = useQueryClient();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", LANDING_KEY)
      .maybeSingle()
      .then(({ data }) => {
        setPages(parseLandingPages(data?.value));
        setLoading(false);
      });
  }, []);

  async function persist(next: LandingPage[]) {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: LANDING_KEY, value: JSON.stringify(next) }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error("Could not save landing pages");
      return false;
    }
    setPages(next);
    await qc.invalidateQueries({ queryKey: contentQuery.queryKey });
    toast.success("Landing pages saved");
    return true;
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading landing pages…</p>;

  if (editing !== null) {
    return (
      <Editor
        initial={editing === -1 ? newLandingPage() : pages[editing]!}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={async (p) => {
          const clash = pages.some((o, i) => o.slug === p.slug && i !== editing);
          if (clash) { toast.error("Another page already uses this link name"); return; }
          const next = editing === -1 ? [...pages, p] : pages.map((o, i) => (i === editing ? p : o));
          if (await persist(next)) setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Create a sales page for any new product or combo. Each page gets its own link and its own order form.
        </p>
        <button onClick={() => setEditing(-1)} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
          + New landing page
        </button>
      </div>
      {pages.length === 0 && <p className="text-sm text-muted-foreground">No landing pages yet.</p>}
      {pages.map((p, i) => (
        <div key={p.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">{p.title} {p.highlight}</p>
            <a href={`/offer/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              /offer/{p.slug}
            </a>
            <p className="text-xs text-muted-foreground">
              {p.active ? "Live" : "Hidden"} · {p.showOnHome ? "Shown on home page" : "Not on home page"} · {p.packages.length} option(s)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(i)} className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-secondary">Edit</button>
            <button
              onClick={() => {
                if (confirm(`Delete "${p.title}"?`)) void persist(pages.filter((_, j) => j !== i));
              }}
              className="rounded-full border border-destructive px-4 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Editor({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: LandingPage;
  saving: boolean;
  onSave: (p: LandingPage) => void;
  onCancel: () => void;
}) {
  const [p, setP] = useState<LandingPage>(initial);
  const set = <K extends keyof LandingPage>(k: K, v: LandingPage[K]) => setP((x) => ({ ...x, [k]: v }));
  const setPkg = (i: number, patch: Partial<LandingPackage>) =>
    setP((x) => ({ ...x, packages: x.packages.map((pk, j) => (j === i ? { ...pk, ...patch } : pk)) }));

  function save() {
    const slug = slugify(p.slug || p.title);
    if (!slug) { toast.error("Add a link name in English, e.g. kitchen-combo"); return; }
    if (!p.title.trim()) { toast.error("Add a headline"); return; }
    if (!p.packages.length || p.packages.some((k) => !k.name.trim() || k.price <= 0))
      { toast.error("Every option needs a name and price"); return; }
    onSave({ ...p, slug });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="font-display text-xl">Page details</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm">Link name (English, e.g. kitchen-combo)</span>
            <input className={input} value={p.slug} onChange={(e) => set("slug", e.target.value)} placeholder="kitchen-combo" />
            <span className="text-xs text-muted-foreground">Page link: /offer/{slugify(p.slug || p.title) || "…"}</span>
          </label>
          <label className="block">
            <span className="text-sm">Small badge</span>
            <input className={input} value={p.badge} onChange={(e) => set("badge", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">Headline</span>
            <input className={input} value={p.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">Headline coloured part</span>
            <input className={input} value={p.highlight} onChange={(e) => set("highlight", e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm">Text under headline</span>
            <textarea rows={3} className={input} value={p.intro} onChange={(e) => set("intro", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">Order button text</span>
            <input className={input} value={p.cta} onChange={(e) => set("cta", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm">Thank-you message after order</span>
            <input className={input} value={p.thanks} onChange={(e) => set("thanks", e.target.value)} />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm">Big top photo</span>
            <ImageField value={p.heroImage} onChange={(u) => set("heroImage", u)} />
          </div>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.active} onChange={(e) => set("active", e.target.checked)} /> Page is live
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.showOnHome} onChange={(e) => set("showOnHome", e.target.checked)} /> Show on main website home page
            </label>
          </div>
        </div>
      </div>

      {p.packages.map((k, i) => (
        <div key={k.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-display text-xl">Option {i + 1} {i === 0 && "(selected by default)"}</p>
            {p.packages.length > 1 && (
              <button
                onClick={() => set("packages", p.packages.filter((_, j) => j !== i))}
                className="text-sm text-destructive underline"
              >
                Remove
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm">Name (single product or combo)</span>
              <input className={input} value={k.name} onChange={(e) => setPkg(i, { name: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm">Price (৳)</span>
              <input type="number" className={input} value={k.price || ""} onChange={(e) => setPkg(i, { price: Number(e.target.value) || 0 })} />
            </label>
            <label className="block">
              <span className="text-sm">Old price, crossed out (৳, optional)</span>
              <input type="number" className={input} value={k.was || ""} onChange={(e) => setPkg(i, { was: Number(e.target.value) || 0 })} />
            </label>
            <label className="block">
              <span className="text-sm">Delivery charge (৳, 0 = free)</span>
              <input type="number" className={input} value={k.deliveryFee || ""} onChange={(e) => setPkg(i, { deliveryFee: Number(e.target.value) || 0 })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm">Features (one per line)</span>
              <textarea rows={4} className={input} value={k.features} onChange={(e) => setPkg(i, { features: e.target.value })} />
            </label>
            <div className="sm:col-span-2">
              <span className="text-sm">Photo</span>
              <ImageField value={k.image} onChange={(u) => setPkg(i, { image: u })} />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => set("packages", [...p.packages, newPackage()])} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">
          + Add product / combo option
        </button>
        <button onClick={save} disabled={saving} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {saving ? "Saving…" : "Save page"}
        </button>
        <button onClick={onCancel} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">Cancel</button>
      </div>
    </div>
  );
}
