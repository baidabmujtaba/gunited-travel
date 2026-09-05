CREATE TABLE public.homepage_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_ar text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  storage_path text,
  file_name text,
  duration_seconds numeric,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES auth.users,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.homepage_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_videos TO authenticated;
GRANT ALL ON public.homepage_videos TO service_role;

ALTER TABLE public.homepage_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active homepage videos"
ON public.homepage_videos FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all homepage videos"
ON public.homepage_videos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert homepage videos"
ON public.homepage_videos FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update homepage videos"
ON public.homepage_videos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete homepage videos"
ON public.homepage_videos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX homepage_videos_order_idx ON public.homepage_videos (is_active, display_order);

CREATE TRIGGER homepage_videos_updated_at BEFORE UPDATE ON public.homepage_videos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();