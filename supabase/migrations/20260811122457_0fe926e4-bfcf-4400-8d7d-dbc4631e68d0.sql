-- 1) Lock down the SECURITY DEFINER one-time admin claim helper
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO service_role;

-- 2) has_role must stay callable by authenticated (used inside RLS policies),
--    but should never be reachable by anonymous visitors.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Re-assert admin-only reads on orders (protects Realtime broadcasts too)
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
CREATE POLICY "Admins can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE SELECT ON public.orders FROM anon;