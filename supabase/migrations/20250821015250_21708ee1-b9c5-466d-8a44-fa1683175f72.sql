-- Add phone_number column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN phone_number text;