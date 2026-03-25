-- Supabase Migration: Paywall Feature Addition
-- Run this in Supabase dashboard > SQL Editor
-- This adds subscription functionality to existing database

-- Add subscription columns to existing user_profiles table (if not already present)
DO $$
BEGIN
    -- Add subscription_tier column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_tier text DEFAULT 'free';
    END IF;

    -- Add subscription_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
    END IF;

    -- Add revenue_cat_user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'revenue_cat_user_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN revenue_cat_user_id text;
    END IF;

    -- Add subscription_expires_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_expires_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_expires_at timestamptz;
    END IF;

    -- Add last_synced_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_synced_at timestamptz;
    END IF;
END $$;

-- Create index for RevenueCat user ID lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_revenue_cat ON user_profiles(revenue_cat_user_id);

-- Create Daily Check-In Usage Tracking table
-- Tracks HomeScreen AI Coach daily check-ins (3 per week for free users)
-- Note: Chat screen messages have separate tracking (10 per day, already implemented client-side)
CREATE TABLE IF NOT EXISTS daily_checkin_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  week_start_date date NOT NULL,
  checkin_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS on daily_checkin_usage
ALTER TABLE daily_checkin_usage ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists and recreate (to handle reruns)
DROP POLICY IF EXISTS "Users own their daily check-in usage" ON daily_checkin_usage;
CREATE POLICY "Users own their daily check-in usage" ON daily_checkin_usage
  FOR ALL USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_checkin_usage_user_week ON daily_checkin_usage(user_id, week_start_date);

-- Verify the changes
SELECT
  'user_profiles columns:' as info,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('subscription_tier', 'subscription_status', 'revenue_cat_user_id', 'subscription_expires_at', 'last_synced_at')
ORDER BY column_name;
