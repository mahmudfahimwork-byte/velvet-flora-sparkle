import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_DEFAULTS, CONTENT_GROUPS, contentQuery } from "@/lib/content";

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
                  {"long" in f && f.long ? (
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
