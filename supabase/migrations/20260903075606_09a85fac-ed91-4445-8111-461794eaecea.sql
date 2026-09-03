CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  path text NOT NULL DEFAULT '/',
  page_title text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'direct',
  campaign text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT 'desktop',
  browser text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  is_new_visitor boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view visits"
ON public.site_visits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX site_visits_created_at_idx ON public.site_visits (created_at DESC);
CREATE INDEX site_visits_session_idx ON public.site_visits (session_id);