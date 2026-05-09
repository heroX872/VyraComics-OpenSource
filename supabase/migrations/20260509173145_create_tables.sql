-- Tabela de usuários
CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  handle     TEXT NOT NULL,
  avatar     TEXT,
  banner     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de HQs
CREATE TABLE hqs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      TEXT REFERENCES users(id),
  author_handle  TEXT,
  name           TEXT NOT NULL,
  genre          TEXT,
  cover          TEXT,
  synopsis       TEXT DEFAULT '',
  chapters       JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS desabilitado (sem autenticação por enquanto)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE hqs   DISABLE ROW LEVEL SECURITY;
