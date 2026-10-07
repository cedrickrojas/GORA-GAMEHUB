-- GORA: complete PostgreSQL setup for pgAdmin Query Tool.
-- Select your existing gora database before running this entire file (F5).
-- PostgreSQL 16+; public schema. No extensions or fixed passwords required.
-- Includes every application migration, constraints, indexes, timestamp triggers,
-- and the 13 baseline sports. Existing rows are retained on repeat runs.
-- Intended for an empty database or one managed by GORA's schema_migrations.
-- If a query fails, execute ROLLBACK; fix the reported issue and run again.
-- This initializes a database; it does not copy your existing PGlite data.
-- After setup, configure DATABASE_URL in .env and restart the API.
-- Optional development people/events/chats: npm.cmd run db:seed.
-- Regenerate after adding migrations: node scripts/export-sql.mjs

BEGIN;
SET LOCAL search_path = public;

-- Coordinate with the app's migration runner if the API is starting up.
SELECT pg_advisory_xact_lock(714723);

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $gora_setup$
BEGIN
  -- 001_initial.sql
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '001') THEN
    EXECUTE $gora_migration_001$
CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, username text NOT NULL UNIQUE,
 full_name text NOT NULL, password_hash text NOT NULL, date_of_birth date NOT NULL,
 role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','banned')),
 token_version integer NOT NULL DEFAULT 0, last_active_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (char_length(username) BETWEEN 3 AND 30)
);
CREATE TABLE profiles (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 bio text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', avatar_url text,
 favorite_team text NOT NULL DEFAULT '', latitude double precision, longitude double precision,
 available_seats integer NOT NULL DEFAULT 2 CHECK(available_seats BETWEEN 0 AND 100),
 group_size integer NOT NULL DEFAULT 4 CHECK(group_size BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(latitude BETWEEN -90 AND 90), CHECK(longitude BETWEEN -180 AND 180)
);
CREATE TABLE sports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, slug text NOT NULL UNIQUE,
 icon text NOT NULL, description text NOT NULL, image_url text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_sports (user_id uuid REFERENCES users(id) ON DELETE CASCADE, sport_id uuid REFERENCES sports(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,sport_id));
CREATE TABLE venues (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, location text NOT NULL, latitude double precision, longitude double precision, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(name,location));
CREATE TABLE events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 sport_id uuid NOT NULL REFERENCES sports(id), venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
 title text NOT NULL, description text NOT NULL DEFAULT '', location text NOT NULL, venue text NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 max_participants integer NOT NULL CHECK(max_participants BETWEEN 2 AND 500),
 required_participants integer NOT NULL DEFAULT 2 CHECK(required_participants >= 1),
 type text NOT NULL CHECK(type IN ('Watch a Game','Play a Game','Practice','Tournament','Casual Match')),
 skill_level text NOT NULL CHECK(skill_level IN ('Beginner','Intermediate','Advanced','Any')),
 privacy text NOT NULL DEFAULT 'Public' CHECK(privacy IN ('Public','Friends','Private')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
 image_url text NOT NULL, featured boolean NOT NULL DEFAULT false,
 latitude double precision, longitude double precision,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at > starts_at), CHECK(required_participants <= max_participants)
);
CREATE TABLE event_participants (event_id uuid REFERENCES events(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'approved' CHECK(status IN ('approved','pending')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(event_id,user_id));
CREATE TABLE event_invitations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE, inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, invitee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_id,invitee_id));
CREATE TABLE friendships (requester_id uuid REFERENCES users(id) ON DELETE CASCADE, addressee_id uuid REFERENCES users(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(requester_id,addressee_id), CHECK(requester_id <> addressee_id));
CREATE UNIQUE INDEX friendship_pair ON friendships(LEAST(requester_id,addressee_id),GREATEST(requester_id,addressee_id));
CREATE TABLE followers (follower_id uuid REFERENCES users(id) ON DELETE CASCADE, following_id uuid REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(follower_id,following_id), CHECK(follower_id <> following_id));
CREATE TABLE conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid UNIQUE REFERENCES events(id) ON DELETE CASCADE, title text NOT NULL, direct_key text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE conversation_members (conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, last_read_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(conversation_id,user_id));
CREATE TABLE messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, actor_id uuid REFERENCES users(id) ON DELETE SET NULL, type text NOT NULL CHECK(type IN ('invitation','join','leave','reminder','message','updated','cancelled','friend_request','friend_accepted','follower','announcement')), title text NOT NULL, body text NOT NULL DEFAULT '', link text NOT NULL DEFAULT '/tabs/home', read_at timestamptz, event_id uuid REFERENCES events(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX reminder_once ON notifications(user_id,event_id,type) WHERE type='reminder';
CREATE TABLE reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, event_id uuid REFERENCES events(id) ON DELETE CASCADE, message_id uuid REFERENCES messages(id) ON DELETE CASCADE, reason text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')), resolution text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(user_id,event_id,message_id)=1));
CREATE TABLE password_reset_tokens (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE communities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sport_id uuid NOT NULL REFERENCES sports(id), name text NOT NULL UNIQUE, description text NOT NULL, location text NOT NULL, image_url text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE community_members (community_id uuid REFERENCES communities(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(community_id,user_id));
CREATE TABLE system_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX events_discovery ON events(sport_id,starts_at) WHERE status='active';
CREATE INDEX events_host ON events(host_id);
CREATE INDEX events_location ON events(lower(location));
CREATE INDEX participants_user ON event_participants(user_id,event_id);
CREATE INDEX messages_conversation ON messages(conversation_id,created_at);
CREATE INDEX notifications_user ON notifications(user_id,created_at DESC);
CREATE INDEX invitations_invitee ON event_invitations(invitee_id);
CREATE INDEX members_user ON conversation_members(user_id);
CREATE INDEX followers_following ON followers(following_id);
CREATE INDEX profiles_location ON profiles(lower(location));
CREATE INDEX reports_status ON reports(status,created_at);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['users','profiles','sports','venues','events','event_participants','event_invitations','friendships','conversations','messages','notifications','reports','communities'] LOOP EXECUTE format('CREATE TRIGGER touch_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t,t); END LOOP; END $$;
$gora_migration_001$;
    INSERT INTO public.schema_migrations (version) VALUES ('001');
    RAISE NOTICE 'Applied migration 001';
  ELSE
    RAISE NOTICE 'Migration 001 already applied; keeping existing data';
  END IF;

  -- 002_sport_icons.sql
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '002') THEN
    EXECUTE $gora_migration_002$
UPDATE sports SET icon = CASE slug
  WHEN 'volleyball' THEN 'volleyball'
  WHEN 'baseball' THEN 'baseball'
  WHEN 'futsal' THEN 'football'
  WHEN 'formula-1' THEN 'flag'
  ELSE icon END
WHERE slug IN ('volleyball','baseball','futsal','formula-1');
$gora_migration_002$;
    INSERT INTO public.schema_migrations (version) VALUES ('002');
    RAISE NOTICE 'Applied migration 002';
  ELSE
    RAISE NOTICE 'Migration 002 already applied; keeping existing data';
  END IF;
END;
$gora_setup$;

-- Baseline sports. Never insert demo users or shared login passwords in SQL.
INSERT INTO sports(name,slug,icon,description,image_url) VALUES
('Basketball','basketball','basketball','Local runs, watch parties, and your basketball crew.','https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=85'),
('Football','football','football','Find your team and the next football match.','https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85'),
('Volleyball','volleyball','volleyball','Rally together on your local court.','https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1200&q=85'),
('Baseball','baseball','baseball','Connect with your local baseball community.','https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1200&q=85'),
('Tennis','tennis','tennisball','Find a doubles partner or your next rally.','https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=85'),
('Badminton','badminton','fitness','Find friendly rallies and competitive matches.','https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=85'),
('Boxing','boxing','fitness','Train with your crew or catch the next fight.','https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85'),
('MMA','mma','fitness','Meet mixed martial arts enthusiasts.','https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85'),
('Futsal','futsal','football','Small-sided games, big energy.','https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85'),
('Esports','esports','game-controller','Squad up and watch competitive gaming.','https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85'),
('Formula 1','formula-1','flag','Find your race-day watch party.','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85'),
('UFC','ufc','fitness','Your next fight-night crew is waiting.','https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=85'),
('Other','other','trophy','Find your game, whatever your sport.','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85')
ON CONFLICT(name) DO NOTHING;

COMMIT;

-- Results: inspect these in pgAdmin's Data Output panel.
SELECT current_database() AS database_name, version AS migration, applied_at
FROM public.schema_migrations ORDER BY version;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT name, slug, icon FROM public.sports ORDER BY name;
