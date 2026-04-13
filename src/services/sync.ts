import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { MovementSession, FoodEntry, CoachSession, Goal, GoalPeriodRecord, FoodChallengeCompletion } from '../types';

// ─── Storage keys (mirrors storage.ts) ─────────────────────────────────────
const MOVEMENT_SESSIONS_KEY = '@reps_movement_sessions';
const CUSTOM_TAGS_KEY = '@reps_custom_tags';
const CUSTOM_MOVEMENT_TYPES_KEY = '@reps_custom_movement_types';
const FOOD_ENTRIES_KEY = '@reps_food_entries';
const ACTIVITY_PREFS_KEY = '@reps_activity_preferences';
const COACH_SESSIONS_KEY = '@coach_sessions';
const SUBSCRIPTION_STATUS_KEY = '@reps_subscription_status';
const GOALS_KEY = '@reps_goals';
const GOAL_PERIODS_KEY = '@reps_goal_periods';
const FOOD_CHALLENGE_COMPLETIONS_KEY = '@reps_food_challenge_completions';

// ─── Private helpers ────────────────────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Row mappers: snake_case DB → camelCase app ─────────────────────────────
function toMovementSession(row: any): MovementSession {
  return {
    id: row.id,
    type: row.type,
    feelings: row.feelings ?? [],
    label: row.label,
    date: row.date,
    note: row.note ?? undefined,
    workoutDetails: row.workout_details ?? undefined,
    goalIds: row.goal_ids ?? undefined,
  };
}

function toFoodEntry(row: any): FoodEntry {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    meal: row.meal ?? undefined,
  };
}

function toCoachSession(row: any): CoachSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    messages: row.messages ?? [],
    memorySummary: row.memory_summary ?? null,
  };
}

function toGoal(row: any): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    goalType: row.goal_type,
    targetValue: row.target_value,
    targetPeriod: row.target_period,
    activityType: row.activity_type ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    currentProgress: row.current_progress,
    lastCalculated: row.last_calculated,
  };
}

function toGoalPeriodRecord(row: any): GoalPeriodRecord {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    targetPeriod: row.target_period,
    targetValue: row.target_value,
    progress: row.progress,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

function toFoodChallengeCompletion(row: any): FoodChallengeCompletion {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    date: row.date,
    completedAt: row.completed_at,
    linkedFoodEntryId: row.linked_food_entry_id ?? undefined,
  };
}

// ─── syncFromSupabase ────────────────────────────────────────────────────────
// Called on app start with await — blocks startup so data is ready before render.
export async function syncFromSupabase(userId: string): Promise<void> {
  try {
    const [
      { data: movSessions },
      { data: foodEnts },
      { data: coachData },
      { data: prefsData },
      { data: profileData },
      { data: goalsData },
      { data: goalPeriodsData },
      { data: foodChallengeData },
    ] = await Promise.all([
      supabase.from('movement_sessions').select('*').eq('user_id', userId),
      supabase.from('food_entries').select('*').eq('user_id', userId),
      supabase.from('coach_sessions').select('*').eq('user_id', userId),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('subscription_tier, subscription_status, subscription_expires_at').eq('user_id', userId).maybeSingle(),
      supabase.from('goals').select('*').eq('user_id', userId),
      supabase.from('goal_periods').select('*').eq('user_id', userId),
      supabase.from('food_challenge_completions').select('*').eq('user_id', userId),
    ]);

    const pairs: [string, string][] = [];

    // Use user-specific keys to isolate data per user
    if (movSessions?.length) {
      pairs.push([`${MOVEMENT_SESSIONS_KEY}_${userId}`, JSON.stringify(movSessions.map(toMovementSession))]);
    }
    if (foodEnts?.length) {
      pairs.push([`${FOOD_ENTRIES_KEY}_${userId}`, JSON.stringify(foodEnts.map(toFoodEntry))]);
    }
    if (coachData?.length) {
      pairs.push([`${COACH_SESSIONS_KEY}_${userId}`, JSON.stringify(coachData.map(toCoachSession))]);
    }
    if (goalsData?.length) {
      pairs.push([`${GOALS_KEY}_${userId}`, JSON.stringify(goalsData.map(toGoal))]);
    }
    if (goalPeriodsData?.length) {
      pairs.push([`${GOAL_PERIODS_KEY}`, JSON.stringify(goalPeriodsData.map(toGoalPeriodRecord))]);
    }
    if (foodChallengeData?.length) {
      pairs.push([`${FOOD_CHALLENGE_COMPLETIONS_KEY}_${userId}`, JSON.stringify(foodChallengeData.map(toFoodChallengeCompletion))]);
    }
    if (prefsData) {
      if (prefsData.custom_tags) {
        pairs.push([CUSTOM_TAGS_KEY, JSON.stringify(prefsData.custom_tags)]);
      }
      if (prefsData.custom_movement_types) {
        pairs.push([CUSTOM_MOVEMENT_TYPES_KEY, JSON.stringify(prefsData.custom_movement_types)]);
      }
      if (prefsData.activity_preferences) {
        pairs.push([ACTIVITY_PREFS_KEY, JSON.stringify(prefsData.activity_preferences)]);
      }
    }

    // Cache subscription status for offline access
    if (profileData) {
      pairs.push([
        SUBSCRIPTION_STATUS_KEY,
        JSON.stringify({
          tier: profileData.subscription_tier || 'free',
          status: profileData.subscription_status || 'inactive',
          expiresAt: profileData.subscription_expires_at || null,
        })
      ]);
    }

    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }
  } catch (error) {
    console.error('[sync] syncFromSupabase error:', error);
  }
}

// ─── Movement Sessions ───────────────────────────────────────────────────────
export async function syncMovementSession(session: MovementSession): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('movement_sessions').upsert({
      id: session.id,
      user_id: userId,
      type: session.type,
      feelings: session.feelings,
      label: session.label,
      date: session.date,
      note: session.note ?? null,
      workout_details: session.workoutDetails ?? null,
      goal_ids: session.goalIds ?? [],
    });
  } catch (error) {
    console.error('[sync] syncMovementSession error:', error);
  }
}

export async function removeMovementSession(id: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('movement_sessions').delete().eq('id', id).eq('user_id', userId);
  } catch (error) {
    console.error('[sync] removeMovementSession error:', error);
  }
}

// ─── Food Entries ────────────────────────────────────────────────────────────
export async function syncFoodEntry(entry: FoodEntry): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('food_entries').upsert({
      id: entry.id,
      user_id: userId,
      date: entry.date,
      description: entry.description,
      meal: entry.meal ?? null,
    });
  } catch (error) {
    console.error('[sync] syncFoodEntry error:', error);
  }
}

export async function removeFoodEntry(id: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('food_entries').delete().eq('id', id).eq('user_id', userId);
  } catch (error) {
    console.error('[sync] removeFoodEntry error:', error);
  }
}

// ─── Coach Sessions ──────────────────────────────────────────────────────────
export async function syncCoachSession(session: CoachSession): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('coach_sessions').upsert({
      id: session.id,
      user_id: userId,
      started_at: session.startedAt,
      ended_at: session.endedAt ?? null,
      messages: session.messages,
      memory_summary: session.memorySummary ?? null,
    });
  } catch (error) {
    console.error('[sync] syncCoachSession error:', error);
  }
}

// ─── User Preferences ────────────────────────────────────────────────────────
export async function syncUserPreferences(): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    const [tagsRaw, typesRaw, prefsRaw] = await Promise.all([
      AsyncStorage.getItem(CUSTOM_TAGS_KEY),
      AsyncStorage.getItem(CUSTOM_MOVEMENT_TYPES_KEY),
      AsyncStorage.getItem(ACTIVITY_PREFS_KEY),
    ]);
    await supabase.from('user_preferences').upsert({
      user_id: userId,
      custom_tags: tagsRaw ? JSON.parse(tagsRaw) : [],
      custom_movement_types: typesRaw ? JSON.parse(typesRaw) : [],
      activity_preferences: prefsRaw ? JSON.parse(prefsRaw) : [],
    });
  } catch (error) {
    console.error('[sync] syncUserPreferences error:', error);
  }
}

// ─── Goals ───────────────────────────────────────────────────────────────────
export async function syncGoal(goal: Goal): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('goals').upsert({
      id: goal.id,
      user_id: userId,
      title: goal.title,
      description: goal.description ?? null,
      goal_type: goal.goalType,
      target_value: goal.targetValue,
      target_period: goal.targetPeriod,
      activity_type: goal.activityType ?? null,
      start_date: goal.startDate,
      end_date: goal.endDate ?? null,
      is_active: goal.isActive,
      current_progress: goal.currentProgress,
      last_calculated: goal.lastCalculated,
      created_at: goal.createdAt,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[sync] syncGoal error:', error);
  }
}

export async function removeGoal(id: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
  } catch (error) {
    console.error('[sync] removeGoal error:', error);
  }
}

// ─── Goal Periods ─────────────────────────────────────────────────────────────
export async function syncGoalPeriodRecord(record: GoalPeriodRecord): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('goal_periods').upsert({
      id: record.id,
      goal_id: record.goalId,
      user_id: userId,
      period_start: record.periodStart,
      period_end: record.periodEnd,
      target_period: record.targetPeriod,
      target_value: record.targetValue,
      progress: record.progress,
      completed: record.completed,
      created_at: record.createdAt,
    });
  } catch (error) {
    console.error('[sync] syncGoalPeriodRecord error:', error);
  }
}

export async function removeGoalPeriodRecordsForGoal(goalId: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('goal_periods').delete().eq('goal_id', goalId).eq('user_id', userId);
  } catch (error) {
    console.error('[sync] removeGoalPeriodRecordsForGoal error:', error);
  }
}

// ─── Food Challenge Completions ──────────────────────────────────────────────
export async function syncFoodChallengeCompletion(completion: FoodChallengeCompletion): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('food_challenge_completions').upsert({
      id: completion.id,
      user_id: userId,
      challenge_id: completion.challengeId,
      date: completion.date,
      completed_at: completion.completedAt,
      linked_food_entry_id: completion.linkedFoodEntryId ?? null,
    });
  } catch (error) {
    console.error('[sync] syncFoodChallengeCompletion error:', error);
  }
}

export async function removeFoodChallengeCompletion(id: string): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return;
    await supabase.from('food_challenge_completions').delete().eq('id', id).eq('user_id', userId);
  } catch (error) {
    console.error('[sync] removeFoodChallengeCompletion error:', error);
  }
}
