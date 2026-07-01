
-- Restrict internal trigger functions (they only run inside triggers)
REVOKE EXECUTE ON FUNCTION public.handle_point_award() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.derive_certificate_point() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.derive_portfolio_point() FROM PUBLIC, anon, authenticated;

-- has_role used by RLS: allow only authenticated, not anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Storage policies for the private 'uploads' bucket
CREATE POLICY "Authenticated can read uploads" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Owners can update uploads" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'uploads' AND owner = auth.uid());
CREATE POLICY "Owners can delete uploads" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'uploads' AND owner = auth.uid());
