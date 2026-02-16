-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to call auto-publish every 5 minutes
SELECT cron.schedule(
  'auto-publish-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ljtikbkilyeyuexzhaqd.supabase.co/functions/v1/auto-publish',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdGlrYmtpbHlleXVleHpoYXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTYyOTEsImV4cCI6MjA2Mzc3MjI5MX0.sAsOSuzaNTq3ii_rkBvH4Q7X8wn2weny0E5VjI-mrys"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);
