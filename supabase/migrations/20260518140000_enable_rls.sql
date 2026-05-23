-- Habilita RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hqs      ENABLE ROW LEVEL SECURITY;

-- ── Policies: profiles ───────────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Policies: hqs ────────────────────────────────────────────────
CREATE POLICY "hqs_select" ON hqs
  FOR SELECT USING (true);

CREATE POLICY "hqs_insert" ON hqs
  FOR INSERT WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "hqs_update" ON hqs
  FOR UPDATE USING (auth.uid()::text = "authorId");

CREATE POLICY "hqs_delete" ON hqs
  FOR DELETE USING (auth.uid()::text = "authorId");

-- ── Storage: avatars ─────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_allow_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_allow_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_allow_delete" ON storage.objects;

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
