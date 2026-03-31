import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getSubscriptionStatus } from './subscriptions';
import { CheckInQuota } from '../types';

const DAILY_CHECKIN_KEY_PREFIX = '@reps_daily_checkin_';
const WEEKLY_CHECKIN_KEY_PREFIX = '@reps_weekly_checkin_';

/**
 * Get today's date in YYYY-MM-DD format
 * Returns date string for the current day
 */
export function getTodayDateString(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Format as YYYY-MM-DD
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

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
 * Premium users have 2 check-ins per day
 * Free users have 3 check-ins per week
 */
export async function getCheckInQuota(): Promise<CheckInQuota> {
  const subscriptionStatus = await getSubscriptionStatus();

  // Premium users: 2 check-ins per day
  if (subscriptionStatus.isActive) {
    const todayDateString = getTodayDateString();
    const storageKey = `${DAILY_CHECKIN_KEY_PREFIX}${todayDateString}`;

    try {
      const storedCount = await AsyncStorage.getItem(storageKey);
      const count = storedCount ? parseInt(storedCount, 10) : 0;

      return {
        remaining: Math.max(0, 2 - count),
        total: 2,
        weekStartDate: todayDateString,
        isPremium: true,
      };
    } catch (error) {
      console.error('Error getting check-in quota:', error);
      return {
        remaining: 2,
        total: 2,
        weekStartDate: todayDateString,
        isPremium: true,
      };
    }
  }

  // Free users: 3 check-ins per week
  const weekStartDate = getWeekStartDate();
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
 * Increment the check-in counter
 * Premium users: daily tracking (2/day)
 * Free users: weekly tracking (3/week)
 */
export async function incrementCheckInCount(): Promise<void> {
  const subscriptionStatus = await getSubscriptionStatus();

  if (subscriptionStatus.isActive) {
    // Premium users: daily tracking (2/day)
    const todayDateString = getTodayDateString();
    const storageKey = `${DAILY_CHECKIN_KEY_PREFIX}${todayDateString}`;

    try {
      const storedCount = await AsyncStorage.getItem(storageKey);
      const count = storedCount ? parseInt(storedCount, 10) : 0;

      const newCount = count + 1;
      await AsyncStorage.setItem(storageKey, String(newCount));

      console.log(`Check-in count incremented: ${newCount}/2 for day ${todayDateString} (Premium)`);

      // Sync to Supabase for analytics
      await syncCheckInCountToSupabase(todayDateString, newCount, true);
    } catch (error) {
      console.error('Error incrementing check-in count:', error);
    }
  } else {
    // Free users: weekly tracking (3/week)
    const weekStartDate = getWeekStartDate();
    const storageKey = `${WEEKLY_CHECKIN_KEY_PREFIX}${weekStartDate}`;

    try {
      const storedCount = await AsyncStorage.getItem(storageKey);
      const count = storedCount ? parseInt(storedCount, 10) : 0;

      const newCount = count + 1;
      await AsyncStorage.setItem(storageKey, String(newCount));

      console.log(`Check-in count incremented: ${newCount}/3 for week ${weekStartDate} (Free)`);

      // Sync to Supabase for analytics
      await syncCheckInCountToSupabase(weekStartDate, newCount, false);
    } catch (error) {
      console.error('Error incrementing check-in count:', error);
    }
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
async function syncCheckInCountToSupabase(dateString: string, count: number, isPremium: boolean): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    // For premium users, dateString is the day; for free users, it's the week start
    const { error } = await supabase
      .from('daily_checkin_usage')
      .upsert({
        user_id: user.id,
        date: dateString,
        checkin_count: count,
        is_premium: isPremium,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('Error syncing check-in count to Supabase:', error);
    }
  } catch (error) {
    console.error('Error in syncCheckInCountToSupabase:', error);
  }
}

/**
 * Get check-in count for a specific day
 * Useful for debugging or displaying history
 */
export async function getCheckInCountForDay(dateString: string): Promise<number> {
  const storageKey = `${DAILY_CHECKIN_KEY_PREFIX}${dateString}`;

  try {
    const storedCount = await AsyncStorage.getItem(storageKey);
    return storedCount ? parseInt(storedCount, 10) : 0;
  } catch (error) {
    console.error('Error getting check-in count for day:', error);
    return 0;
  }
}
