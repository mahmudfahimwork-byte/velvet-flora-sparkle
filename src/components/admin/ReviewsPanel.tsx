import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/shop";

export type Review = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  image_url: string;
  product_slug: string;
  visible: boolean;
  sort_order: number;
};

type Draft = Omit<Review, "id"> & { id?: string };

const emptyDraft: Draft = {
  author_name: "",
  rating: 5,
  body: "",
  image_url: "",
  product_slug: "",
  visible: true,
  sort_order: 0,
};

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: rev }, { data: prod }] = await Promise.all([
      supabase.from("reviews").select("*").order("sort_order").order("created_at"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    setReviews((rev ?? []) as Review[]);
    setProducts((prod ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("That file is not an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
      toast.error(signErr?.message ?? "Could not read the uploaded photo");
      return;
    }
    setDraft((d) => (d ? { ...d, image_url: data.signedUrl } : d));
    toast.success("Photo uploaded");
  }

  async function save() {
    if (!draft) return;
    if (!draft.body.trim() && !draft.image_url) {
      toast.error("Add some review text or a photo");
      return;
    }
    const payload = {
      author_name: draft.author_name.trim(),
      rating: Math.min(5, Math.max(1, draft.rating || 5)),
      body: draft.body.trim(),
      image_url: draft.image_url,
      product_slug: draft.product_slug,
      visible: draft.visible,
      sort_order: draft.sort_order,
    };
    if (draft.id) {
      const { error } = await supabase.from("reviews").update(payload).eq("id", draft.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("reviews")
        .insert({ ...payload, sort_order: reviews.length });
      if (error) return toast.error(error.message);
    }
    setDraft(null);
    toast.success("Review saved");
    void load();
  }

  async function toggleVisible(r: Review) {
    setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, visible: !x.visible } : x)));
    const { error } = await supabase.from("reviews").update({ visible: !r.visible }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      void load();
    }
  }

  async function remove(r: Review) {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    setReviews((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Review deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl">Customer reviews</p>
          <p className="text-sm text-muted-foreground">
            Reviews appear on product pages. Choose “All products” to show one everywhere, or pick a
            single piece. Use the switch to show or hide any review.
          </p>
        </div>
        <button
          onClick={() => setDraft({ ...emptyDraft, sort_order: reviews.length })}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Add review
        </button>
      </div>

      {draft && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Customer name
              <input
                value={draft.author_name}
                onChange={(e) => setDraft({ ...draft, author_name: e.target.value })}
                placeholder="e.g. Nusrat"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="text-sm">
              Rating (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={draft.rating}
                onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          <label className="block text-sm">
            Review text
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block text-sm">
            Show on
            <select
              value={draft.product_slug}
              onChange={(e) => setDraft({ ...draft, product_slug: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">
              Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPhoto(f);
                  e.target.value = "";
                }}
                className="mt-1 block text-sm"
              />
            </label>
            {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
            {draft.image_url && (
              <div className="flex items-center gap-2">
                <img
                  src={draft.image_url}
                  alt="Review"
                  className="size-16 rounded-lg border border-border object-cover"
                />
                <button
                  onClick={() => setDraft({ ...draft, image_url: "" })}
                  className="text-xs underline"
                >
                  Remove
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
              />
              Visible on the website
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Save review
            </button>
            <button
              onClick={() => setDraft(null)}
              className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Add your first one.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={r.author_name || "Review"}
                  className="size-14 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="size-14 rounded-lg border border-dashed border-border" />
              )}
              <div className="min-w-48 flex-1">
                <p className="text-sm font-medium">
                  {r.author_name || "Customer"} · {"★".repeat(Math.max(1, Math.min(5, r.rating)))}
                </p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.product_slug
                    ? `Shows on: ${products.find((p) => p.slug === r.product_slug)?.name ?? r.product_slug}`
                    : "Shows on: all products"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={r.visible} onChange={() => void toggleVisible(r)} />
                  {r.visible ? "Visible" : "Hidden"}
                </label>
                <button onClick={() => setDraft({ ...r })} className="text-xs underline">
                  Edit
                </button>
                <button onClick={() => void remove(r)} className="text-xs text-destructive underline">
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
