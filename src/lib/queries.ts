import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./shop";

/** One shared fetch of the catalogue — every page reads from this cache. */
export const productsQuery = queryOptions({
  queryKey: ["products", "all"],
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (error) throw error;
    return (data ?? []) as Product[];
  },
});
