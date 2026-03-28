-- Add height and weight fields to user_profiles table
-- Run in Supabase dashboard > SQL Editor

-- Add height column (in inches)
alter table user_profiles
add column if not exists height_inches numeric;

-- Add weight column (in pounds)
alter table user_profiles
add column if not exists weight_lbs numeric;

-- Add comment for documentation
comment on column user_profiles.height_inches is 'User height in inches';
comment on column user_profiles.weight_lbs is 'User weight in pounds';
