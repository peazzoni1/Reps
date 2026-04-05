import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodChallengeCompletion } from '../types';
import { supabase } from '../lib/supabase';
import * as Sync from './sync';
import { toLocalDateStr } from './storage';

const FOOD_CHALLENGE_COMPLETIONS_KEY = '@reps_food_challenge_completions';

const getUserKey = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return `${FOOD_CHALLENGE_COMPLETIONS_KEY}_${user.id}`;
    }
  } catch (error) {
    console.error('Error getting user for storage key:', error);
  }
  return FOOD_CHALLENGE_COMPLETIONS_KEY;
};

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const getAllFoodChallengeCompletions = async (): Promise<FoodChallengeCompletion[]> => {
  try {
    const key = await getUserKey();
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading food challenge completions:', error);
    return [];
  }
};

export const getTodayFoodChallengeCompletion = async (): Promise<FoodChallengeCompletion | null> => {
  const completions = await getAllFoodChallengeCompletions();
  const todayStr = toLocalDateStr(new Date());
  return completions.find(c => c.date === todayStr) ?? null;
};

export const createFoodChallengeCompletion = async (
  challengeId: string,
  linkedFoodEntryId?: string
): Promise<FoodChallengeCompletion> => {
  const completions = await getAllFoodChallengeCompletions();
  const todayStr = toLocalDateStr(new Date());
  const newCompletion: FoodChallengeCompletion = {
    id: generateId(),
    challengeId,
    date: todayStr,
    completedAt: new Date().toISOString(),
    linkedFoodEntryId,
  };
  completions.push(newCompletion);
  const key = await getUserKey();
  await AsyncStorage.setItem(key, JSON.stringify(completions));
  Sync.syncFoodChallengeCompletion(newCompletion);
  return newCompletion;
};

export const linkFoodEntryToCompletion = async (
  completionId: string,
  foodEntryId: string
): Promise<void> => {
  const completions = await getAllFoodChallengeCompletions();
  const index = completions.findIndex(c => c.id === completionId);
  if (index === -1) return;
  completions[index] = { ...completions[index], linkedFoodEntryId: foodEntryId };
  const key = await getUserKey();
  await AsyncStorage.setItem(key, JSON.stringify(completions));
  Sync.syncFoodChallengeCompletion(completions[index]);
};

export const calculateFoodChallengeStreak = async (): Promise<number> => {
  const completions = await getAllFoodChallengeCompletions();
  if (completions.length === 0) return 0;

  // Sort descending by date
  const sorted = [...completions].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const completion of sorted) {
    const completionDate = new Date(completion.date + 'T00:00:00');
    completionDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > streak + 1) {
      // Gap — streak broken
      break;
    }

    if (daysDiff === streak) {
      streak++;
      currentDate = completionDate;
    }
  }

  return streak;
};
