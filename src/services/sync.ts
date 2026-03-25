import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { MovementSession, FoodEntry, CoachSession } from '../types';

// ─── Storage keys (mirrors storage.ts) ─────────────────────────────────────
const MOVEMENT_SESSIONS_KEY = '@reps_movement_sessions';
const CUSTOM_TAGS_KEY = '@reps_custom_tags';
const CUSTOM_MOVEMENT_TYPES_KEY = '@reps_custom_movement_types';
const FOOD_ENTRIES_KEY = '@reps_food_entries';
const ACTIVITY_PREFS_KEY = '@reps_activity_preferences';
const COACH_SESSIONS_KEY = '@coach_sessions';
const SUBSCRIPTION_STATUS_KEY = '@reps_subscription_status';

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
    ] = await Promise.all([
      supabase.from('movement_sessions').select('*').eq('user_id', userId),
      supabase.from('food_entries').select('*').eq('user_id', userId),
      supabase.from('coach_sessions').select('*').eq('user_id', userId),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('subscription_tier, subscription_status, subscription_expires_at').eq('user_id', userId).maybeSingle(),
    ]);

    const pairs: [string, string][] = [];

    if (movSessions?.length) {
      pairs.push([MOVEMENT_SESSIONS_KEY, JSON.stringify(movSessions.map(toMovementSession))]);
    }
    if (foodEnts?.length) {
      pairs.push([FOOD_ENTRIES_KEY, JSON.stringify(foodEnts.map(toFoodEntry))]);
    }
    if (coachData?.length) {
      pairs.push([COACH_SESSIONS_KEY, JSON.stringify(coachData.map(toCoachSession))]);
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
