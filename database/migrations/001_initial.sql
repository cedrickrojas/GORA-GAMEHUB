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
