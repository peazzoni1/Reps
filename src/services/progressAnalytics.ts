import {
  DailySnapshot,
  Achievement,
  WeeklySummary,
  PatternData,
  FeelingType,
  MovementSession,
} from '../types';
import { getDailyCheckIn } from './anthropic';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_STORAGE_KEY = '@reps_achievements';
const WEEKLY_SUMMARIES_STORAGE_KEY = '@reps_weekly_summaries';

// ============================================================================
// Achievement Detection
// ============================================================================

/**
 * Detect new achievements from recent data
 * Uses rule-based logic (safer than AI) for PR detection, streaks, milestones
 */
export async function detectAchievements(
  recentData: DailySnapshot[]
): Promise<Achievement[]> {
  const achievements: Achievement[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Load existing achievements to avoid duplicates
  const existingAchievements = await getStoredAchievements();
  const existingIds = new Set(existingAchievements.map((a) => a.id));

  // 1. Detect Personal Records (PRs)
  const prAchievements = detectPersonalRecords(recentData, existingIds);
  achievements.push(...prAchievements);

  // 2. Detect Workout Streaks
  const streakAchievement = detectWorkoutStreak(recentData, existingIds);
  if (streakAchievement) achievements.push(streakAchievement);

  // 3. Detect Milestones (total workouts)
  const milestoneAchievement = detectWorkoutMilestone(recentData, existingIds);
  if (milestoneAchievement) achievements.push(milestoneAchievement);

  // 4. Detect Consistency (4+ weeks of 3+ workouts per week)
  const consistencyAchievement = detectConsistency(recentData, existingIds);
  if (consistencyAchievement) achievements.push(consistencyAchievement);

  // Store new achievements
  if (achievements.length > 0) {
    await storeAchievements([...existingAchievements, ...achievements]);
  }

  return achievements;
}

/**
 * Detect personal records in recent workouts
 */
function detectPersonalRecords(
  data: DailySnapshot[],
  existingIds: Set<string>
): Achievement[] {
  const achievements: Achievement[] = [];
  const exerciseMaxes: Record<string, { weight: number; date: string }> = {};

  // Track max weight for each exercise
  for (const day of data) {
    for (const session of day.exercises) {
      if (session.workoutDetails) {
        for (const exercise of session.workoutDetails) {
          if (exercise.weight && exercise.name) {
            const key = exercise.name.toLowerCase();
            if (!exerciseMaxes[key] || exercise.weight > exerciseMaxes[key].weight) {
              exerciseMaxes[key] = { weight: exercise.weight, date: day.date };
            }
          }
        }
      }
    }
  }

  // Create achievements for PRs in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

  for (const [exerciseName, max] of Object.entries(exerciseMaxes)) {
    if (max.date >= cutoffDate) {
      const id = `pr-${exerciseName}-${max.weight}-${max.date}`;
      if (!existingIds.has(id)) {
        achievements.push({
          id,
          type: 'pr',
          title: `New PR: ${capitalize(exerciseName)} - ${max.weight} lbs`,
          description: `You hit a new personal record on ${exerciseName}`,
          date: max.date,
          icon: '🎉',
          exercise: exerciseName,
          value: max.weight,
        });
      }
    }
  }

  return achievements;
}

/**
 * Detect current workout streak
 */
function detectWorkoutStreak(
  data: DailySnapshot[],
  existingIds: Set<string>
): Achievement | null {
  const streak = calculateCurrentStreak(data);

  // Create achievements for streak milestones
  const milestones = [7, 14, 21, 30, 60, 90, 100, 180, 365];
  for (const milestone of milestones) {
    if (streak >= milestone) {
      const id = `streak-${milestone}`;
      if (!existingIds.has(id)) {
        const today = new Date().toISOString().split('T')[0];
        return {
          id,
          type: 'streak',
          title: `${milestone}-Day Workout Streak`,
          description: `You've logged workouts for ${milestone} consecutive days`,
          date: today,
          icon: '🔥',
        };
      }
    }
  }

  return null;
}

/**
 * Detect total workout milestones
 */
function detectWorkoutMilestone(
  data: DailySnapshot[],
  existingIds: Set<string>
): Achievement | null {
  const totalWorkouts = data.reduce(
    (sum, day) => sum + day.exercises.length,
    0
  );

  const milestones = [10, 25, 50, 75, 100, 150, 200, 250, 365, 500, 1000];
  for (const milestone of milestones) {
    if (totalWorkouts >= milestone) {
      const id = `milestone-${milestone}`;
      if (!existingIds.has(id)) {
        const today = new Date().toISOString().split('T')[0];
        return {
          id,
          type: 'milestone',
          title: `${milestone} Workouts Logged!`,
          description: `You've reached ${milestone} total workouts`,
          date: today,
          icon: '🎯',
        };
      }
    }
  }

  return null;
}

/**
 * Detect consistency (4+ weeks of 3+ workouts per week)
 */
function detectConsistency(
  data: DailySnapshot[],
  existingIds: Set<string>
): Achievement | null {
  // Group by week
  const weeks: Record<string, number> = {};
  for (const day of data) {
    if (day.exercises.length > 0) {
      const weekStart = getWeekStart(new Date(day.date));
      weeks[weekStart] = (weeks[weekStart] || 0) + day.exercises.length;
    }
  }

  // Count consecutive weeks with 3+ workouts
  const sortedWeeks = Object.entries(weeks)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .filter(([_, count]) => count >= 3);

  let consecutiveWeeks = 0;
  let prevWeek: Date | null = null;

  for (const [weekStr] of sortedWeeks) {
    const weekDate = new Date(weekStr);
    if (prevWeek) {
      const daysDiff = Math.abs(
        (prevWeek.getTime() - weekDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 10) break; // More than 1 week + buffer, break streak
    }
    consecutiveWeeks++;
    prevWeek = weekDate;
  }

  const milestones = [4, 8, 12, 26, 52];
  for (const milestone of milestones) {
    if (consecutiveWeeks >= milestone) {
      const id = `consistency-${milestone}`;
      if (!existingIds.has(id)) {
        const today = new Date().toISOString().split('T')[0];
        return {
          id,
          type: 'consistency',
          title: `${milestone} Weeks of Consistency`,
          description: `You've logged 3+ workouts per week for ${milestone} consecutive weeks`,
          date: today,
          icon: '⭐',
        };
      }
    }
  }

  return null;
}

// ============================================================================
// Weekly Summary Generation
// ============================================================================

/**
 * Generate AI-powered weekly summary (descriptive only, no advice)
 */
export async function generateWeeklySummary(
  weekData: DailySnapshot[]
): Promise<WeeklySummary> {
  const weekStart = getWeekStart(new Date());
  const weekEnd = getWeekEnd(new Date());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Calculate basic stats
  const workoutCount = weekData.reduce(
    (sum, day) => sum + day.exercises.length,
    0
  );
  const currentStreak = calculateCurrentStreak(weekData);

  // Find top category
  const categoryCount: Record<string, number> = {};
  for (const day of weekData) {
    for (const exercise of day.exercises) {
      const category = getCategoryFromType(exercise.type);
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  }
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate total minutes (estimate 45 min per workout if not specified)
  const totalMinutes = workoutCount * 45;

  // Find top feeling
  const feelingCount: Record<string, number> = {};
  for (const day of weekData) {
    for (const exercise of day.exercises) {
      for (const feeling of exercise.feelings) {
        feelingCount[feeling] = (feelingCount[feeling] || 0) + 1;
      }
    }
  }
  const topFeeling = (Object.entries(feelingCount).sort((a, b) => b[1] - a[1])[0]?.[0] as FeelingType) || null;

  // Generate AI text summary (descriptive only)
  let text = '';
  if (workoutCount === 0) {
    text = 'No workouts logged this week yet.';
  } else {
    const parts: string[] = [];

    parts.push(`You logged ${workoutCount} ${workoutCount === 1 ? 'workout' : 'workouts'} this week`);

    if (currentStreak > 0) {
      parts.push(`maintaining a ${currentStreak}-day streak`);
    }

    if (topCategory) {
      parts.push(`${topCategory} was your primary focus`);
    }

    if (topFeeling) {
      parts.push(`most common feeling: ${capitalize(topFeeling)}`);
    }

    text = parts.join(', ') + '.';
  }

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    text,
    workoutCount,
    currentStreak,
    topCategory,
    totalMinutes,
    topFeeling,
  };
}

// ============================================================================
// Pattern Calculation
// ============================================================================

/**
 * Calculate workout patterns and trends
 */
export function calculatePatterns(data: DailySnapshot[]): PatternData {
  // Workout frequency by date
  const workoutFrequency = data.map((day) => ({
    date: day.date,
    count: day.exercises.length,
  }));

  // Exercise distribution by category
  const categoryCount: Record<string, number> = {};
  let totalExercises = 0;
  for (const day of data) {
    for (const exercise of day.exercises) {
      const category = getCategoryFromType(exercise.type);
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      totalExercises++;
    }
  }

  const exerciseDistribution = Object.entries(categoryCount).map(
    ([category, count]) => ({
      category,
      percentage: totalExercises > 0 ? Math.round((count / totalExercises) * 100) : 0,
    })
  );

  // Feeling trends
  const feelingCount: Record<string, number> = {};
  for (const day of data) {
    for (const exercise of day.exercises) {
      for (const feeling of exercise.feelings) {
        feelingCount[feeling] = (feelingCount[feeling] || 0) + 1;
      }
    }
  }

  const feelingTrends = Object.entries(feelingCount).map(([feeling, count]) => ({
    feeling: feeling as FeelingType,
    count,
  }));

  // Strength progression (track weight over time for each exercise)
  const exerciseWeights: Record<
    string,
    { date: string; weight: number }[]
  > = {};

  for (const day of data) {
    for (const session of day.exercises) {
      if (session.workoutDetails) {
        for (const exercise of session.workoutDetails) {
          if (exercise.weight && exercise.name) {
            const key = exercise.name.toLowerCase();
            if (!exerciseWeights[key]) exerciseWeights[key] = [];
            exerciseWeights[key].push({
              date: day.date,
              weight: exercise.weight,
            });
          }
        }
      }
    }
  }

  const strengthProgression = Object.entries(exerciseWeights).map(
    ([exercise, data]) => ({
      exercise,
      data: data.sort((a, b) => a.date.localeCompare(b.date)),
    })
  );

  return {
    workoutFrequency,
    exerciseDistribution,
    feelingTrends,
    strengthProgression,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate current workout streak
 */
export function calculateCurrentStreak(data: DailySnapshot[]): number {
  // Sort by date descending
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const day of sorted) {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > streak + 1) {
      // Gap in streak
      break;
    }

    if (day.exercises.length > 0) {
      if (daysDiff === streak) {
        streak++;
        currentDate = dayDate;
      }
    }
  }

  return streak;
}

/**
 * Get category name from movement type
 */
function getCategoryFromType(type: string): string {
  if (type === 'strength_training') return 'Strength';
  if (type === 'running') return 'Cardio';
  if (type === 'cycling') return 'Cardio';
  if (type === 'walking') return 'Cardio';
  if (type === 'yoga') return 'Flexibility';
  if (type === 'stretching') return 'Flexibility';
  return 'Other';
}

/**
 * Get the start of the current week (Sunday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the current week (Saturday)
 */
function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Storage Functions
// ============================================================================

export async function getStoredAchievements(): Promise<Achievement[]> {
  try {
    const stored = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading achievements:', error);
    return [];
  }
}

export async function storeAchievements(
  achievements: Achievement[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ACHIEVEMENTS_STORAGE_KEY,
      JSON.stringify(achievements)
    );
  } catch (error) {
    console.error('Error storing achievements:', error);
  }
}

export async function getRecentAchievements(
  limit: number = 5
): Promise<Achievement[]> {
  const all = await getStoredAchievements();
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
