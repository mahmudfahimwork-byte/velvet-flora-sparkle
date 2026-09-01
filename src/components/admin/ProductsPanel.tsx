import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, categoryLabel, taka, type Product } from "@/lib/shop";

const EMPTY = {
  name: "",
  slug: "",
  category: "bracelet",
  price: 700,
  description: "",
  image_url: "",
  in_stock: true,
  featured: false,
};

type Draft = typeof EMPTY & { id?: string };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductsPanel({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data, error: signErr } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 20);
    setUploading(false);
    if (signErr || !data?.signedUrl) {
      toast.error(signErr?.message ?? "Could not read the uploaded image");
      return;
    }
    setDraft((d) => (d ? { ...d, image_url: data.signedUrl } : d));
    toast.success("Photo uploaded");
  }


  async function load() {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (!error && data) {
      setProducts(data as Product[]);
      onCountChange?.(data.length);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    const payload = {
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      category: draft.category,
      price: Number(draft.price),
      description: draft.description,
      image_url: draft.image_url,
      in_stock: draft.in_stock,
      featured: draft.featured,
    };
    const { error } = draft.id
      ? await supabase.from("products").update(payload).eq("id", draft.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(draft.id ? "Product updated" : "Product added");
    setDraft(null);
    void load();
  }

  async function toggle(p: Product, field: "in_stock" | "featured") {
    const patch =
      field === "in_stock" ? { in_stock: !p.in_stock } : { featured: !p.featured };
    const { error } = await supabase.from("products").update(patch).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: !p[field] } : x)));
  }

  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted");
    void load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {products.length} product(s) · {products.filter((p) => p.in_stock).length} in stock
        </p>
        <button
          onClick={() => setDraft({ ...EMPTY })}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Add product
        </button>
      </div>

      {draft && (
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Slug (link)
            <input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Category
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Price (৳)
            <input
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Product photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
                e.target.value = "";
              }}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs"
            />
            {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
            {draft.image_url && !uploading && (
              <span className="mt-2 flex items-center gap-2">
                <img src={draft.image_url} alt="Product preview" className="size-14 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, image_url: "" })}
                  className="text-xs text-destructive underline"
                >
                  Remove
                </button>
              </span>
            )}
          </label>

          <label className="text-sm sm:col-span-2">
            Description
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center gap-5 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.in_stock}
                onChange={(e) => setDraft({ ...draft, in_stock: e.target.checked })}
              />
              In stock
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
              />
              Featured on homepage
            </label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save product"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-border px-5 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
              <img
                src={p.image_url}
                alt={p.name}
                className="size-16 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-40 flex-1">
                <p className="font-display text-lg leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabel(p.category)} · {taka(p.price)} · /{p.slug}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => toggle(p, "in_stock")}
                  className={`rounded-full px-3 py-1 ${p.in_stock ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/10 text-destructive"}`}
                >
                  {p.in_stock ? "In stock" : "Sold out"}
                </button>
                <button
                  onClick={() => toggle(p, "featured")}
                  className={`rounded-full px-3 py-1 ${p.featured ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}
                >
                  {p.featured ? "Featured" : "Not featured"}
                </button>
                <button
                  onClick={() => setDraft({ ...p })}
                  className="rounded-full border border-border px-3 py-1 hover:bg-secondary"
                >
                  Edit
                </button>
                <button onClick={() => remove(p)} className="rounded-full border border-border px-3 py-1 text-destructive hover:bg-secondary">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
