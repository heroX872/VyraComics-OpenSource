-- Tabela de perfis (padrão Supabase)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT,
  avatar_url   TEXT,
  banner_url   TEXT,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de HQs
CREATE TABLE hqs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "authorId"     TEXT NOT NULL,
  "authorHandle" TEXT,
  name           TEXT NOT NULL,
  genre          TEXT,
  cover          TEXT,
  synopsis       TEXT DEFAULT '',
  chapters       JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS desabilitado temporariamente (será ativado na migration seguinte)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE hqs      DISABLE ROW LEVEL SECURITY;
