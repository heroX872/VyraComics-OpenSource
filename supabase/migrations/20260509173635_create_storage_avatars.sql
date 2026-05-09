-- Bucket público para avatares e banners de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública
CREATE POLICY "avatars_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Upload/update/delete sem autenticação (sem auth por enquanto)
CREATE POLICY "avatars_allow_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_allow_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "avatars_allow_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');
