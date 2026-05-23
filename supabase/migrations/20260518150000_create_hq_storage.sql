-- Buckets para HQs
INSERT INTO storage.buckets (id, name, public)
VALUES ('hq-covers', 'hq-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('hq-pages', 'hq-pages', true)
ON CONFLICT (id) DO NOTHING;

-- ── Policies: hq-covers ─────────────────────────────────────────
DROP POLICY IF EXISTS "hq_covers_select" ON storage.objects;
CREATE POLICY "hq_covers_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'hq-covers');

DROP POLICY IF EXISTS "hq_covers_insert" ON storage.objects;
CREATE POLICY "hq_covers_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hq-covers' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "hq_covers_update" ON storage.objects;
CREATE POLICY "hq_covers_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'hq-covers' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "hq_covers_delete" ON storage.objects;
CREATE POLICY "hq_covers_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'hq-covers' AND auth.uid() IS NOT NULL);

-- ── Policies: hq-pages ──────────────────────────────────────────
DROP POLICY IF EXISTS "hq_pages_select" ON storage.objects;
CREATE POLICY "hq_pages_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'hq-pages');

DROP POLICY IF EXISTS "hq_pages_insert" ON storage.objects;
CREATE POLICY "hq_pages_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hq-pages' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "hq_pages_update" ON storage.objects;
CREATE POLICY "hq_pages_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'hq-pages' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "hq_pages_delete" ON storage.objects;
CREATE POLICY "hq_pages_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'hq-pages' AND auth.uid() IS NOT NULL);
