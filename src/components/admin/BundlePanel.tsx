import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BUNDLE_DEFAULTS, BUNDLE_KEYS, bundleQuery } from "@/lib/bundle";

export function BundlePanel() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(BUNDLE_DEFAULTS.enabled);
  const [percent, setPercent] = useState(String(BUNDLE_DEFAULTS.percent));
  const [minPieces, setMinPieces] = useState(String(BUNDLE_DEFAULTS.minPieces));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void qc.fetchQuery(bundleQuery).then((s) => {
      setEnabled(s.enabled);
      setPercent(String(s.percent));
      setMinPieces(String(s.minPieces));
    });
  }, [qc]);

  async function save() {
    const p = Number(percent);
    const m = Number(minPieces);
    if (!Number.isFinite(p) || p <= 0 || p > 90) {
      toast.error("Discount must be between 1% and 90%");
      return;
    }
    if (!Number.isFinite(m) || m < 2 || m > 10) {
      toast.error("Number of pieces must be between 2 and 10");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("site_content").upsert(
      [
        { key: BUNDLE_KEYS.enabled, value: enabled ? "1" : "0" },
        { key: BUNDLE_KEYS.percent, value: String(Math.round(p)) },
        { key: BUNDLE_KEYS.min, value: String(Math.round(m)) },
      ],
      { onConflict: "key" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: bundleQuery.queryKey });
    toast.success("Offer updated");
  }

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <p className="font-display text-xl">“Complete the look” offer</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {enabled
          ? `Shoppers who add ${minPieces || "?"} or more different pieces get ${percent || "?"}% off.`
          : "The offer is switched off — no bundle discount is shown or applied anywhere."}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Offer is on
        </label>

        <label className="text-sm">
          Discount (%)
          <input
            type="number"
            min={1}
            max={90}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="text-sm">
          Pieces needed
          <input
            type="number"
            min={2}
            max={10}
            value={minPieces}
            onChange={(e) => setMinPieces(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <button
          onClick={() => void save()}
          disabled={busy}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save offer"}
        </button>
      </div>
    </div>
  );
}
