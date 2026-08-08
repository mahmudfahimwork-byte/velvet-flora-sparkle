CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  price integer NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  in_stock boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly viewable" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE DEFAULT ('VF-' || upper(substr(md5(random()::text), 1, 6))),
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  area text NOT NULL DEFAULT 'inside_dhaka',
  notes text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal integer NOT NULL,
  delivery_fee integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

INSERT INTO public.products (name, slug, category, price, description, image_url, featured) VALUES
('Rose Petal Charm Bracelet', 'rose-petal-charm-bracelet', 'bracelet', 750, 'Delicate gold-tone chain with hand-set rose petal charms. Adjustable clasp, tarnish resistant.', '/images/bracelet-1.jpg', true),
('Pearl Drop Bracelet', 'pearl-drop-bracelet', 'bracelet', 650, 'Soft freshwater-style pearls on a fine golden link. Everyday elegance for any occasion.', '/images/bracelet-2.jpg', false),
('Evil Eye Beaded Bracelet', 'evil-eye-beaded-bracelet', 'bracelet', 520, 'Blue evil eye bead with tiny crystal spacers. Stretch fit, one size.', '/images/bracelet-3.jpg', false),
('Blooming Lotus Pendant', 'blooming-lotus-pendant', 'pendant', 900, 'Gold-plated lotus pendant on an 18 inch chain. A gentle statement piece.', '/images/pendant-1.jpg', true),
('Tiny Heart Locket', 'tiny-heart-locket', 'pendant', 800, 'Minimal heart locket that opens to hold a little memory. Comes gift boxed.', '/images/pendant-2.jpg', false),
('Crescent Moon Pendant', 'crescent-moon-pendant', 'pendant', 690, 'Slim crescent moon with a single crystal star. Layers beautifully.', '/images/pendant-3.jpg', false),
('Golden Bell Anklet', 'golden-bell-anklet', 'anklet', 550, 'Classic ghungroo bell anklet with a soft chime. Adjustable length.', '/images/anklet-1.jpg', true),
('Floral Chain Anklet', 'floral-chain-anklet', 'anklet', 620, 'Fine chain with pressed flower charms. Water resistant plating.', '/images/anklet-2.jpg', false),
('Beaded Payel Anklet', 'beaded-payel-anklet', 'anklet', 500, 'Handmade beaded payel in blush and gold tones. Sold as a pair.', '/images/anklet-3.jpg', false);