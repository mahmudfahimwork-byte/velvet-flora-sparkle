import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BUNDLE } from "./shop";

export const BUNDLE_KEYS = {
  enabled: "bundle.enabled",
  percent: "bundle.percent",
  min: "bundle.minPieces",
} as const;

export type BundleSettings = {
  enabled: boolean;
  percent: number;
  minPieces: number;
};

export const BUNDLE_DEFAULTS: BundleSettings = {
  enabled: true,
  percent: BUNDLE.percent,
  minPieces: BUNDLE.minPieces,
};

export const bundleQuery = queryOptions({
  queryKey: ["bundle-settings"],
  staleTime: 60_000,
  queryFn: async (): Promise<BundleSettings> => {
    const { data, error } = await supabase
      .from("site_content")
      .select("key,value")
      .in("key", [BUNDLE_KEYS.enabled, BUNDLE_KEYS.percent, BUNDLE_KEYS.min]);
    if (error) throw error;
    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    const percent = Number(map[BUNDLE_KEYS.percent]);
    const min = Number(map[BUNDLE_KEYS.min]);
    return {
      enabled: map[BUNDLE_KEYS.enabled] !== undefined
        ? map[BUNDLE_KEYS.enabled] === "1"
        : BUNDLE_DEFAULTS.enabled,
      percent: Number.isFinite(percent) && percent > 0 ? percent : BUNDLE_DEFAULTS.percent,
      minPieces: Number.isFinite(min) && min >= 2 ? Math.round(min) : BUNDLE_DEFAULTS.minPieces,
    };
  },
});

/** Live bundle-offer settings plus a discount calculator that respects them. */
export function useBundle() {
  const { data } = useQuery(bundleQuery);
  const s = data ?? BUNDLE_DEFAULTS;
  return {
    ...s,
    discount(distinctCount: number, subtotal: number) {
      if (!s.enabled || distinctCount < s.minPieces) return 0;
      return Math.round((subtotal * s.percent) / 100);
    },
  };
}
