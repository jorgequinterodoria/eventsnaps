-- Create extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC NOT NULL DEFAULT 0
);

INSERT INTO public.plans (id, name, features, price)
VALUES 
  ('basic', 'Básico', '{"gallery": false, "playlist": true, "tv_mode": false, "white_label": false, "max_storage_gb": 0.5}'::jsonb, 50000),
  ('pro',   'Pro',    '{"gallery": true,  "playlist": true, "tv_mode": true,  "white_label": true,  "max_storage_gb": 10}'::jsonb,  100000)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, features = EXCLUDED.features, price = EXCLUDED.price;

-- User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  plan_id TEXT NOT NULL DEFAULT 'basic' REFERENCES public.plans(id),
  full_name TEXT,
  instagram_username TEXT,
  custom_logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for new user
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, plan_id)
  VALUES (
    new.id, 
    new.email, 
    CASE WHEN new.email = 'jquintedori@gmail.com' THEN 'admin' ELSE 'user' END,
    'basic'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to create trigger, ignore if exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  creator_id TEXT NOT NULL DEFAULT 'anonymous',
  moderation_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Photos
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by TEXT NOT NULL DEFAULT 'anonymous',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Moderation
CREATE TABLE IF NOT EXISTS public.moderation_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE,
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  gemini_suggestion TEXT,
  confidence_score NUMERIC,
  processed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE,
  moderator_id TEXT NOT NULL DEFAULT 'anonymous',
  action TEXT NOT NULL,
  reason TEXT,
  actioned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jukebox
CREATE TABLE IF NOT EXISTS public.jukebox_settings (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  vibe_filters JSONB DEFAULT '[]'::jsonb,
  spotify_playlist_id TEXT,
  provider TEXT NOT NULL DEFAULT 'spotify',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.jukebox_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  spotify_track_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art TEXT,
  genre TEXT,
  votes INTEGER NOT NULL DEFAULT 0,
  voters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'spotify',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Subscriptions (for Wompi / Mercado Pago integration)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'trialing'
        CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  external_subscription_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Configs
CREATE TABLE IF NOT EXISTS public.admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Enablement
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jukebox_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jukebox_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Reseting old policies just in case
DROP POLICY IF EXISTS "Public events access" ON public.events;
DROP POLICY IF EXISTS "Public photos access" ON public.photos;
DROP POLICY IF EXISTS "Public moderation queue" ON public.moderation_queues;
DROP POLICY IF EXISTS "Public moderation action" ON public.moderation_actions;
DROP POLICY IF EXISTS "Public jukebox settings" ON public.jukebox_settings;
DROP POLICY IF EXISTS "Public jukebox queue" ON public.jukebox_queue;
DROP POLICY IF EXISTS "Public plans" ON public.plans;
DROP POLICY IF EXISTS "Users view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admin all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Public admin_config" ON public.admin_config;

-- Creating policies
CREATE POLICY "Public events access" ON public.events FOR ALL USING (true);
CREATE POLICY "Public photos access" ON public.photos FOR ALL USING (true);
CREATE POLICY "Public moderation queue" ON public.moderation_queues FOR ALL USING (true);
CREATE POLICY "Public moderation action" ON public.moderation_actions FOR ALL USING (true);
CREATE POLICY "Public jukebox settings" ON public.jukebox_settings FOR ALL USING (true);
CREATE POLICY "Public jukebox queue" ON public.jukebox_queue FOR ALL USING (true);
CREATE POLICY "Public plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Public admin_config" ON public.admin_config FOR ALL USING (true);
-- Admin checking function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT role = 'admin' INTO is_admin FROM public.user_profiles WHERE id = auth.uid();
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Users view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admin all profiles" ON public.user_profiles FOR ALL USING (
  public.check_is_admin()
);

-- user_subscriptions policies
DROP POLICY IF EXISTS "Users read own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admin all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users read own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin all subscriptions" ON public.user_subscriptions FOR ALL USING (public.check_is_admin());
