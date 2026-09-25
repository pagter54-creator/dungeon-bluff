-- Rebuild PostgREST metadata after a schema-cache retry loop.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
