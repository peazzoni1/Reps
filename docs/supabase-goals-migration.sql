-- Goals Feature Migration
-- This migration adds support for user goals and goal tracking

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('activity_count', 'streak', 'custom')),
  target_value INTEGER NOT NULL,
  target_period TEXT NOT NULL CHECK (target_period IN ('daily', 'weekly', 'monthly', 'custom')),
  activity_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_active ON goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_goals_activity_type ON goals(activity_type) WHERE activity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own goals
CREATE POLICY goals_user_isolation ON goals
  FOR ALL
  USING (auth.uid() = user_id);

-- Add goal_ids column to movement_sessions table
ALTER TABLE movement_sessions ADD COLUMN IF NOT EXISTS goal_ids TEXT[] DEFAULT '{}';

-- Create GIN index for array containment queries
CREATE INDEX IF NOT EXISTS idx_movement_sessions_goal_ids ON movement_sessions USING GIN(goal_ids);

-- Add comment to document the schema
COMMENT ON TABLE goals IS 'User fitness goals with progress tracking';
COMMENT ON COLUMN goals.goal_type IS 'Type of goal: activity_count (e.g., run 3x/week), streak (e.g., 30-day streak), or custom';
COMMENT ON COLUMN goals.target_period IS 'Period for goal: daily, weekly, monthly, or custom';
COMMENT ON COLUMN goals.current_progress IS 'Cached progress value (number of activities completed)';
COMMENT ON COLUMN goals.last_calculated IS 'Timestamp of last progress calculation';
COMMENT ON COLUMN movement_sessions.goal_ids IS 'Array of goal IDs this activity is linked to';
