ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bought_together(_slug text, _limit integer DEFAULT 4)
RETURNS TABLE (slug text, score bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.item->>'slug' AS slug, count(*)::bigint AS score
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS a(item)
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS b(item)
  WHERE o.status <> 'cancelled'
    AND a.item->>'slug' = _slug
    AND b.item->>'slug' IS DISTINCT FROM _slug
  GROUP BY 1
  ORDER BY 2 DESC, 1
  LIMIT greatest(_limit, 0)
$$;

CREATE OR REPLACE FUNCTION public.popular_products(_limit integer DEFAULT 8)
RETURNS TABLE (slug text, score bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.item->>'slug' AS slug, sum(coalesce((a.item->>'qty')::int, 1))::bigint AS score
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS a(item)
  WHERE o.status <> 'cancelled'
  GROUP BY 1
  ORDER BY 2 DESC, 1
  LIMIT greatest(_limit, 0)
$$;

REVOKE ALL ON FUNCTION public.bought_together(text, integer) FROM public;
REVOKE ALL ON FUNCTION public.popular_products(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.bought_together(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.popular_products(integer) TO anon, authenticated;