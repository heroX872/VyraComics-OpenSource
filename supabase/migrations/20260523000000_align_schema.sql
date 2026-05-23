-- Alinha o schema com o app.js:
--   users → profiles (com colunas: username, avatar_url, banner_url, display_name)
--   hqs  → author_id → authorId, author_handle → authorHandle

-- 1. Dropa FK antiga antes de dropar a tabela users
ALTER TABLE hqs DROP CONSTRAINT IF EXISTS hqs_author_id_fkey;

-- 2. Cria profiles (padrão Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT,
  avatar_url   TEXT,
  banner_url   TEXT,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Remove a tabela users (nome errado)
DROP TABLE IF EXISTS users CASCADE;

-- 4. Renomeia colunas da hqs para lowerCamelCase (compatível com app.js)
ALTER TABLE hqs RENAME COLUMN author_id     TO "authorId";
ALTER TABLE hqs RENAME COLUMN author_handle TO "authorHandle";

-- 5. RLS: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 6. Atualiza RLS: hqs (agora com os nomes novos)
DROP POLICY IF EXISTS "hqs_insert" ON hqs;
DROP POLICY IF EXISTS "hqs_update" ON hqs;
DROP POLICY IF EXISTS "hqs_delete" ON hqs;

CREATE POLICY "hqs_insert" ON hqs
  FOR INSERT WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "hqs_update" ON hqs
  FOR UPDATE USING (auth.uid()::text = "authorId");

CREATE POLICY "hqs_delete" ON hqs
  FOR DELETE USING (auth.uid()::text = "authorId");

-- 7. Atualiza policies do storage: avatars (exigem auth.uid())
DROP POLICY IF EXISTS "avatars_allow_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_allow_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_allow_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
