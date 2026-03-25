import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getSubscriptionStatus } from './subscriptions';
import { CheckInQuota } from '../types';

const WEEKLY_CHECKIN_KEY_PREFIX = '@reps_weekly_checkin_';

/**
 * Get the start date of the current week (Sunday)
 * Returns date in YYYY-MM-DD format
 */
export function getWeekStartDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  // Calculate how many days to subtract to get to Sunday
  const daysToSubtract = dayOfWeek; // Sunday = 0 days, Monday = 1 day, etc.

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);

  // Format as YYYY-MM-DD
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get current check-in quota for the user
 * Premium users have unlimited quota
 * Free users have 3 check-ins per week
 */
export async function getCheckInQuota(): Promise<CheckInQuota> {
  const subscriptionStatus = await getSubscriptionStatus();
  const weekStartDate = getWeekStartDate();

  // Premium users have unlimited check-ins
  if (subscriptionStatus.isActive) {
    return {
      remaining: Infinity,
      total: Infinity,
      weekStartDate,
      isPremium: true,
    };
  }

  // Free users: 3 check-ins per week
  const storageKey = `${WEEKLY_CHECKIN_KEY_PREFIX}${weekStartDate}`;

  try {
    const storedCount = await AsyncStorage.getItem(storageKey);
    const count = storedCount ? parseInt(storedCount, 10) : 0;

    return {
      remaining: Math.max(0, 3 - count),
      total: 3,
      weekStartDate,
      isPremium: false,
    };
  } catch (error) {
    console.error('Error getting check-in quota:', error);

    // Return safe default on error
    return {
      remaining: 3,
      total: 3,
      weekStartDate,
      isPremium: false,
    };
  }
}

/**
 * Increment the check-in counter for the current week
 * Only increments for free users (premium users don't need tracking)
 */
export async function incrementCheckInCount(): Promise<void> {
  const subscriptionStatus = await getSubscriptionStatus();

  // Premium users don't need usage tracking
  if (subscriptionStatus.isActive) {
    return;
  }

  const weekStartDate = getWeekStartDate();
  const storageKey = `${WEEKLY_CHECKIN_KEY_PREFIX}${weekStartDate}`;

  try {
    // Get current count
    const storedCount = await AsyncStorage.getItem(storageKey);
    const count = storedCount ? parseInt(storedCount, 10) : 0;

    // Increment and store
    const newCount = count + 1;
    await AsyncStorage.setItem(storageKey, String(newCount));

    console.log(`Check-in count incremented: ${newCount}/3 for week ${weekStartDate}`);

    // Sync to Supabase for analytics
    await syncCheckInCountToSupabase(weekStartDate, newCount);
  } catch (error) {
    console.error('Error incrementing check-in count:', error);
  }
}

/**
 * Check if user can use a check-in
 * Returns true if user has remaining quota (or is premium)
 */
export async function canUseCheckIn(): Promise<boolean> {
  const quota = await getCheckInQuota();
  return quota.isPremium || quota.remaining > 0;
}

/**
 * Sync check-in count to Supabase for analytics
 * Updates the daily_checkin_usage table
 */
async function syncCheckInCountToSupabase(weekStartDate: string, count: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from('daily_checkin_usage')
      .upsert({
        user_id: user.id,
        week_start_date: weekStartDate,
        checkin_count: count,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,week_start_date'
      });

    if (error) {
      console.error('Error syncing check-in count to Supabase:', error);
    }
  } catch (error) {
    console.error('Error in syncCheckInCountToSupabase:', error);
  }
}

/**
 * Get check-in count for a specific week
 * Useful for debugging or displaying history
 */
export async function getCheckInCountForWeek(weekStartDate: string): Promise<number> {
  const storageKey = `${WEEKLY_CHECKIN_KEY_PREFIX}${weekStartDate}`;

  try {
    const storedCount = await AsyncStorage.getItem(storageKey);
    return storedCount ? parseInt(storedCount, 10) : 0;
  } catch (error) {
    console.error('Error getting check-in count for week:', error);
    return 0;
  }
}
