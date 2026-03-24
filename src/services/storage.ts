import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovementSession, MovementType, FeelingType, WorkoutExercise, FoodEntry, MealType, DailySnapshot, ChatMessage, CoachSession, MemoryBullet } from '../types';
import * as Sync from './sync';

const MOVEMENT_SESSIONS_KEY = '@reps_movement_sessions';
const CUSTOM_TAGS_KEY = '@reps_custom_tags';
const CUSTOM_MOVEMENT_TYPES_KEY = '@reps_custom_movement_types';
const FOOD_ENTRIES_KEY = '@reps_food_entries';
const ACTIVITY_PREFS_KEY = '@reps_activity_preferences';
const COACH_SESSIONS_KEY = '@coach_sessions';

// Helper function to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Movement Session Operations
export const createMovementSession = async (
  type: MovementType,
  feelings: FeelingType[],
  label: string,
  note?: string,
  workoutDetails?: WorkoutExercise[],
  date?: string
): Promise<MovementSession> => {
  const sessions = await getAllMovementSessions();
  const newSession: MovementSession = {
    id: generateId(),
    type,
    feelings,
    label,
    date: date ? `${date}T12:00:00.000Z` : new Date().toISOString(),
    note,
    workoutDetails,
  };
  sessions.push(newSession);
  await AsyncStorage.setItem(MOVEMENT_SESSIONS_KEY, JSON.stringify(sessions));
  Sync.syncMovementSession(newSession);
  return newSession;
};

export const getAllMovementSessions = async (): Promise<MovementSession[]> => {
  try {
    const data = await AsyncStorage.getItem(MOVEMENT_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading movement sessions:', error);
    return [];
  }
};

export const getRecentMovementSessions = async (limit: number = 14): Promise<MovementSession[]> => {
  const sessions = await getAllMovementSessions();
  return sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};

export const updateMovementSession = async (
  id: string,
  type: MovementType,
  feelings: FeelingType[],
  label: string,
  note?: string,
  date?: string
): Promise<MovementSession | null> => {
  const sessions = await getAllMovementSessions();
  const index = sessions.findIndex(s => s.id === id);
  if (index === -1) return null;
  sessions[index] = { ...sessions[index], type, feelings, label, note, ...(date ? { date: `${date}T12:00:00.000Z` } : {}) };
  await AsyncStorage.setItem(MOVEMENT_SESSIONS_KEY, JSON.stringify(sessions));
  Sync.syncMovementSession(sessions[index]);
  return sessions[index];
};

export const deleteMovementSession = async (id: string): Promise<boolean> => {
  const sessions = await getAllMovementSessions();
  const filtered = sessions.filter(s => s.id !== id);
  if (filtered.length === sessions.length) return false;
  await AsyncStorage.setItem(MOVEMENT_SESSIONS_KEY, JSON.stringify(filtered));
  Sync.removeMovementSession(id);
  return true;
};

// Custom Tags Operations
export const getCustomTags = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_TAGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading custom tags:', error);
    return [];
  }
};

export const addCustomTag = async (tag: string): Promise<void> => {
  try {
    const tags = await getCustomTags();
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      tags.push(trimmedTag);
      await AsyncStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(tags));
      Sync.syncUserPreferences();
    }
  } catch (error) {
    console.error('Error adding custom tag:', error);
  }
};

// Custom Movement Types Operations
export const getCustomMovementTypes = async (): Promise<Array<{ id: string; label: string; icon: string }>> => {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_MOVEMENT_TYPES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading custom movement types:', error);
    return [];
  }
};

export const addCustomMovementType = async (label: string, icon: string = '•'): Promise<void> => {
  try {
    const types = await getCustomMovementTypes();
    const trimmedLabel = label.trim();
    if (trimmedLabel && !types.some(t => t.label === trimmedLabel)) {
      const newType = {
        id: trimmedLabel.toLowerCase().replace(/\s+/g, '_'),
        label: trimmedLabel,
        icon,
      };
      types.push(newType);
      await AsyncStorage.setItem(CUSTOM_MOVEMENT_TYPES_KEY, JSON.stringify(types));
      Sync.syncUserPreferences();
    }
  } catch (error) {
    console.error('Error adding custom movement type:', error);
  }
};

// Activity Preference Operations
export interface ActivityPreference {
  id: string;
  visible: boolean;
}

export const getActivityPreferences = async (): Promise<ActivityPreference[]> => {
  try {
    const data = await AsyncStorage.getItem(ACTIVITY_PREFS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading activity preferences:', error);
    return [];
  }
};

export const saveActivityPreferences = async (prefs: ActivityPreference[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVITY_PREFS_KEY, JSON.stringify(prefs));
    Sync.syncUserPreferences();
  } catch (error) {
    console.error('Error saving activity preferences:', error);
  }
};

// Food Entry Operations
export const createFoodEntry = async (description: string, meal?: MealType, date?: string): Promise<FoodEntry> => {
  const entries = await getAllFoodEntries();
  const newEntry: FoodEntry = {
    id: generateId(),
    date: date ? `${date}T12:00:00.000Z` : new Date().toISOString(),
    description,
    meal,
  };
  entries.push(newEntry);
  await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(entries));
  Sync.syncFoodEntry(newEntry);
  return newEntry;
};

export const getAllFoodEntries = async (): Promise<FoodEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(FOOD_ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading food entries:', error);
    return [];
  }
};

export const updateFoodEntry = async (id: string, description: string, meal?: MealType, date?: string): Promise<FoodEntry | null> => {
  const entries = await getAllFoodEntries();
  const index = entries.findIndex(e => e.id === id);
  if (index === -1) return null;
  entries[index] = { ...entries[index], description, meal, ...(date ? { date: `${date}T12:00:00.000Z` } : {}) };
  await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(entries));
  Sync.syncFoodEntry(entries[index]);
  return entries[index];
};

export const deleteFoodEntry = async (id: string): Promise<boolean> => {
  const entries = await getAllFoodEntries();
  const filtered = entries.filter(e => e.id !== id);
  if (filtered.length === entries.length) return false;
  await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(filtered));
  Sync.removeFoodEntry(id);
  return true;
};

// Daily Snapshot — aggregates exercise + food for the last N days
export const toLocalDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getRecentDailySnapshots = async (days: number = 10): Promise<DailySnapshot[]> => {
  const [sessions, foodEntries] = await Promise.all([
    getAllMovementSessions(),
    getAllFoodEntries(),
  ]);

  const snapshots: DailySnapshot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const dateStr = toLocalDateStr(day);

    const dayExercises = sessions.filter(s => toLocalDateStr(new Date(s.date)) === dateStr);
    const dayFood = foodEntries.filter(f => toLocalDateStr(new Date(f.date)) === dateStr);

    if (dayExercises.length > 0 || dayFood.length > 0) {
      snapshots.push({ date: dateStr, exercises: dayExercises, food: dayFood });
    }
  }

  return snapshots;
};

// Daily check-in message history
const DAILY_MESSAGES_HISTORY_KEY = '@reps_daily_messages_history';

export interface DailyCheckInMessage {
  date: string; // YYYY-MM-DD
  headline: string;
  body: string;
}

export const getCachedDailyMessage = async (): Promise<DailyCheckInMessage | null> => {
  try {
    const raw = await AsyncStorage.getItem(DAILY_MESSAGES_HISTORY_KEY);
    if (!raw) return null;
    const history: DailyCheckInMessage[] = JSON.parse(raw);
    const today = toLocalDateStr(new Date());
    return history.find((m) => m.date === today) ?? null;
  } catch {
    return null;
  }
};

export const storeDailyMessage = async (msg: DailyCheckInMessage): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(DAILY_MESSAGES_HISTORY_KEY);
    const history: DailyCheckInMessage[] = raw ? JSON.parse(raw) : [];
    const filtered = history.filter((m) => m.date !== msg.date);
    filtered.push(msg);
    const trimmed = filtered.sort((a, b) => a.date.localeCompare(b.date)).slice(-4);
    await AsyncStorage.setItem(DAILY_MESSAGES_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
};

export const clearTodayDailyMessage = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(DAILY_MESSAGES_HISTORY_KEY);
    if (!raw) return;
    const history: DailyCheckInMessage[] = JSON.parse(raw);
    const today = toLocalDateStr(new Date());
    const filtered = history.filter((m) => m.date !== today);
    await AsyncStorage.setItem(DAILY_MESSAGES_HISTORY_KEY, JSON.stringify(filtered));
  } catch {}
};

export const getPreviousDailyMessages = async (): Promise<DailyCheckInMessage[]> => {
  try {
    const raw = await AsyncStorage.getItem(DAILY_MESSAGES_HISTORY_KEY);
    if (!raw) return [];
    const history: DailyCheckInMessage[] = JSON.parse(raw);
    const today = toLocalDateStr(new Date());
    return history
      .filter((m) => m.date !== today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-3);
  } catch {
    return [];
  }
};

// Coach Session Operations
const saveAllCoachSessions = async (sessions: CoachSession[]): Promise<void> => {
  await AsyncStorage.setItem(COACH_SESSIONS_KEY, JSON.stringify(sessions));
};

export const getAllCoachSessions = async (): Promise<CoachSession[]> => {
  try {
    const raw = await AsyncStorage.getItem(COACH_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getActiveCoachSession = async (): Promise<CoachSession | null> => {
  const sessions = await getAllCoachSessions();
  return sessions.find((s) => s.endedAt === null) ?? null;
};

export const createCoachSession = async (): Promise<CoachSession> => {
  const sessions = await getAllCoachSessions();
  const newSession: CoachSession = {
    id: generateId(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    messages: [],
    memorySummary: null,
  };
  sessions.push(newSession);
  await saveAllCoachSessions(sessions);
  Sync.syncCoachSession(newSession);
  return newSession;
};

export const updateCoachSessionMessages = async (
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> => {
  const sessions = await getAllCoachSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], messages };
  await saveAllCoachSessions(sessions);
  Sync.syncCoachSession(sessions[idx]);
};

export const closeCoachSession = async (
  sessionId: string,
  summary: MemoryBullet[] | null
): Promise<void> => {
  const sessions = await getAllCoachSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx] = {
    ...sessions[idx],
    endedAt: new Date().toISOString(),
    memorySummary: summary,
  };
  await saveAllCoachSessions(sessions);
  Sync.syncCoachSession(sessions[idx]);
};

export const getArchivedCoachSessions = async (): Promise<CoachSession[]> => {
  const sessions = await getAllCoachSessions();
  return sessions
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
};

export const getSessionMemorySummaries = async (): Promise<
  { date: string; bullets: MemoryBullet[] }[]
> => {
  const sessions = await getAllCoachSessions();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  return sessions
    .filter(
      (s) =>
        s.endedAt !== null &&
        Array.isArray(s.memorySummary) &&
        s.memorySummary.length > 0 &&
        new Date(s.startedAt) >= cutoff
    )
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((s) => ({
      date: toLocalDateStr(new Date(s.startedAt)),
      bullets: s.memorySummary as MemoryBullet[],
    }));
};

// Daily coach usage tracking (client-side, keyed by date so it resets automatically)
const DAILY_COACH_USAGE_PREFIX = '@coach_daily_usage_';

export const getDailyCoachMessageCount = async (): Promise<number> => {
  const key = `${DAILY_COACH_USAGE_PREFIX}${toLocalDateStr(new Date())}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
};

export const incrementDailyCoachMessageCount = async (): Promise<number> => {
  const key = `${DAILY_COACH_USAGE_PREFIX}${toLocalDateStr(new Date())}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const next = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
};

// Daily Notes
const DAILY_NOTES_PREFIX = '@reps_daily_notes_';

export interface DailyNote {
  date: string;        // YYYY-MM-DD
  content: string;
  updatedAt: string;   // ISO timestamp
}

export const getDailyNote = async (date: string): Promise<DailyNote | null> => {
  try {
    const key = `${DAILY_NOTES_PREFIX}${date}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading daily note:', error);
    return null;
  }
};

export const saveDailyNote = async (date: string, content: string): Promise<void> => {
  try {
    const key = `${DAILY_NOTES_PREFIX}${date}`;
    const note: DailyNote = {
      date,
      content,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(note));
  } catch (error) {
    console.error('Error saving daily note:', error);
  }
};

export const getAllDailyNotes = async (): Promise<DailyNote[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const noteKeys = keys.filter(key => key.startsWith(DAILY_NOTES_PREFIX));
    const notes = await AsyncStorage.multiGet(noteKeys);
    return notes
      .map(([_, value]) => (value ? JSON.parse(value) : null))
      .filter((note): note is DailyNote => note !== null && note.content.trim().length > 0)
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
  } catch (error) {
    console.error('Error loading all daily notes:', error);
    return [];
  }
};

export const deleteDailyNote = async (date: string): Promise<void> => {
  try {
    const key = `${DAILY_NOTES_PREFIX}${date}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting daily note:', error);
  }
};

// Helper functions for tile status
export const getTodayMovementSessions = async (): Promise<MovementSession[]> => {
  const sessions = await getAllMovementSessions();
  const todayStr = toLocalDateStr(new Date());
  return sessions.filter(s => toLocalDateStr(new Date(s.date)) === todayStr);
};

export const getTodayFoodEntries = async (): Promise<FoodEntry[]> => {
  const entries = await getAllFoodEntries();
  const todayStr = toLocalDateStr(new Date());
  return entries.filter(e => toLocalDateStr(new Date(e.date)) === todayStr);
};

// Utility: clear all data
export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    MOVEMENT_SESSIONS_KEY,
    CUSTOM_TAGS_KEY,
    CUSTOM_MOVEMENT_TYPES_KEY,
    FOOD_ENTRIES_KEY,
    ACTIVITY_PREFS_KEY,
    COACH_SESSIONS_KEY,
    DAILY_MESSAGES_HISTORY_KEY,
  ]);
};
