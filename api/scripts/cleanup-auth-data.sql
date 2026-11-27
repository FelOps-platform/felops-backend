-- FelOps auth cleanup for Supabase.
-- Run manually in the SQL editor, or uncomment the pg_cron block to schedule it.
-- Deletes only rows that can no longer be used: expired/revoked sessions and
-- expired/consumed auth codes.

DELETE FROM sessions
WHERE expires_at <= now()
   OR revoked_at IS NOT NULL;

DELETE FROM auth_codes
WHERE expires_at <= now()
   OR consumed_at IS NOT NULL;

-- Optional: schedule daily at 03:00 UTC with pg_cron (enable the extension first).
-- SELECT cron.schedule(
--   'felops-auth-cleanup',
--   '0 3 * * *',
--   $$
--     DELETE FROM sessions WHERE expires_at <= now() OR revoked_at IS NOT NULL;
--     DELETE FROM auth_codes WHERE expires_at <= now() OR consumed_at IS NOT NULL;
--   $$
-- );
