REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.owns_save(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_save(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_match(uuid) TO authenticated;
