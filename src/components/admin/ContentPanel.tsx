import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_DEFAULTS, CONTENT_GROUPS, contentQuery } from "@/lib/content";
import { compressImage, formatFileSize } from "@/lib/image-compression";
import { cdnImage } from "@/components/site/SmartImage";

function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const result = await compressImage(file);
      const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage.from("product-images").upload(path, result.file, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 20);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not read the uploaded image");
      onChange(data.signedUrl);
      toast.success(`Uploaded ${formatFileSize(result.originalBytes)} → ${formatFileSize(result.compressedBytes)} — now press Save changes`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-1 space-y-2">
      {value ? (
        <img src={cdnImage(value)} alt="" className="h-32 w-32 rounded-lg border border-border object-cover" />
      ) : (
        <p className="text-xs text-muted-foreground">Using the built-in sample photo.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
          className="text-xs" />
        {value && (
          <button type="button" onClick={() => onChange("")} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">
            Remove
          </button>
        )}
      </div>
      {busy && <p className="text-xs text-muted-foreground">Compressing and uploading…</p>}
    </div>
  );
}

export function ContentPanel() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase
      .from("site_content")
      .select("key,value")
      .then(({ data }) => {
        const saved = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        setValues({ ...CONTENT_DEFAULTS, ...saved });
        setLoading(false);
      });
  }, []);

  async function saveAll() {
    setSaving(true);
    const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error("Could not save the text");
      return;
    }
    await qc.invalidateQueries({ queryKey: contentQuery.queryKey });
    toast.success("Website text updated");
  }

  function resetAll() {
    if (!confirm("Reset every text back to the original wording?")) return;
    setValues({ ...CONTENT_DEFAULTS });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading website text…</p>;

  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search text…"
          className="min-w-52 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={resetAll} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">
          Reset to original
        </button>
      </div>

      {CONTENT_GROUPS.map((g) => {
        const fields = g.fields.filter(
          (f) =>
            !q ||
            f.label.toLowerCase().includes(q) ||
            g.group.toLowerCase().includes(q) ||
            (values[f.key] ?? "").toLowerCase().includes(q),
        );
        if (!fields.length) return null;
        return (
          <div key={g.group} className="rounded-xl border border-border bg-card p-5">
            <p className="font-display text-xl">{g.group}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className={"long" in f && f.long ? "sm:col-span-2 block" : "block"}>
                  <span className="text-sm">{f.label}</span>
                  {"image" in f && f.image ? (
                    <ImageField value={values[f.key] ?? ""} onChange={(url) => setValues((v) => ({ ...v, [f.key]: url }))} />
                  ) : "long" in f && f.long ? (
                    <textarea
                      rows={3}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <input
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={saveAll}
        disabled={saving}
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
