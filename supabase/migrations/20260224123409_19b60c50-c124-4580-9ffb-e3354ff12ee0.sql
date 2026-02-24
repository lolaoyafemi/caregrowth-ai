-- Fix NULL email_change column in auth.users causing "converting NULL to string is unsupported" error
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET email_change_confirm_status = 0 WHERE email_change_confirm_status IS NULL;