CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects(user_id);
-- Photos are NOT stored here. local_ref points to the photo in the user's browser (IndexedDB).
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  width int CHECK (width BETWEEN 1 AND 20000),
  height int CHECK (height BETWEEN 1 AND 20000),
  local_ref text CHECK (length(local_ref) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_project_idx ON photos(project_id);
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('original','edited')),
  profile text CHECK (length(profile) <= 30),
  overall int NOT NULL CHECK (overall BETWEEN 0 AND 100),
  scores jsonb NOT NULL,
  measurements jsonb,
  gemini jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analyses_photo_idx ON analyses(photo_id);
CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  settings jsonb NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  local_ref text CHECK (length(local_ref) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS versions_photo_idx ON versions(photo_id);
CREATE TABLE IF NOT EXISTS usage (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  kind text NOT NULL,
  count int NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, day, kind)
);
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session(expire);
