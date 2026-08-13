ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_source_check CHECK (source IN ('website','messenger'));
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_code_key ON public.orders (order_code);
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));