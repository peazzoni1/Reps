-- Fix user_profiles table constraints
-- Run this in Supabase dashboard > SQL Editor

-- Step 1: Check current constraints on user_profiles table
-- (This is just for information - the query below will show you the current schema)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Remove NOT NULL constraint from sex column if it exists
-- This makes the sex column optional (nullable)
ALTER TABLE user_profiles
ALTER COLUMN sex DROP NOT NULL;

-- Step 3: Remove NOT NULL constraint from birthdate column if it exists
-- This makes the birthdate column optional (nullable)
ALTER TABLE user_profiles
ALTER COLUMN birthdate DROP NOT NULL;

-- Step 4: Verify the changes
SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('sex', 'birthdate');

-- Expected result: Both columns should show is_nullable = 'YES'
