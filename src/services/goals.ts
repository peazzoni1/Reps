import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, GoalType, GoalPeriodRecord, TargetPeriod, MovementType, MovementSession } from '../types';
import { getAllMovementSessions } from './storage';
import * as Sync from './sync';

const GOALS_KEY = '@reps_goals';
const GOAL_PERIODS_KEY = '@reps_goal_periods';

// Helper function to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ==================== CRUD Operations ====================

export const createGoal = async (
  goalData: Omit<Goal, 'id' | 'createdAt' | 'currentProgress' | 'lastCalculated'>
): Promise<Goal> => {
  const goals = await getAllGoals();
  const newGoal: Goal = {
    ...goalData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    currentProgress: 0,
    lastCalculated: new Date().toISOString(),
  };
  goals.push(newGoal);
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  Sync.syncGoal(newGoal);
  return newGoal;
};

export const getAllGoals = async (): Promise<Goal[]> => {
  try {
    const data = await AsyncStorage.getItem(GOALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading goals:', error);
    return [];
  }
};

export const getActiveGoals = async (): Promise<Goal[]> => {
  const goals = await getAllGoals();
  return goals.filter(g => g.isActive);
};

export const getGoalsByActivityType = async (type: MovementType): Promise<Goal[]> => {
  const goals = await getActiveGoals();
  return goals.filter(g => g.activityType === type);
};

export const getGoalById = async (id: string): Promise<Goal | null> => {
  const goals = await getAllGoals();
  return goals.find(g => g.id === id) || null;
};

export const updateGoal = async (id: string, updates: Partial<Goal>): Promise<Goal | null> => {
  const goals = await getAllGoals();
  const index = goals.findIndex(g => g.id === id);
  if (index === -1) return null;

  goals[index] = { ...goals[index], ...updates };
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  Sync.syncGoal(goals[index]);
  return goals[index];
};

export const deleteGoal = async (id: string): Promise<boolean> => {
  const goals = await getAllGoals();
  const filtered = goals.filter(g => g.id !== id);
  if (filtered.length === goals.length) return false;

  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(filtered));
  Sync.removeGoal(id);

  // Cleanup: Remove goal ID from all movement sessions
  await cleanupDeletedGoalFromSessions(id);

  // Cleanup: Remove all period records for this goal
  await deleteGoalPeriodRecordsForGoal(id);

  return true;
};

export const toggleGoalActive = async (id: string): Promise<boolean> => {
  const goal = await getGoalById(id);
  if (!goal) return false;

  await updateGoal(id, { isActive: !goal.isActive });
  return true;
};

// ==================== Progress Calculation ====================

/**
 * Get date range for a target period
 */
export const getPeriodDateRange = (
  period: TargetPeriod,
  startDate?: string
): { start: string; end: string } => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'daily':
      return { start: today, end: today };

    case 'weekly': {
      // Week starts on Sunday
      const dayOfWeek = now.getDay();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - dayOfWeek);
      const sundayStr = sunday.toISOString().split('T')[0];
      return { start: sundayStr, end: today };
    }

    case 'monthly': {
      // Month starts on 1st
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      return { start: firstDayStr, end: today };
    }

    case 'custom': {
      if (!startDate) return { start: today, end: today };
      return { start: startDate, end: today };
    }

    default:
      return { start: today, end: today };
  }
};

/**
 * Calculate current progress for a goal
 */
export const calculateGoalProgress = async (goal: Goal): Promise<number> => {
  const sessions = await getAllMovementSessions();

  // Get date range for the period
  const { start, end } = getPeriodDateRange(goal.targetPeriod, goal.startDate);

  // Filter sessions by date range
  const relevantSessions = sessions.filter(session => {
    const sessionDate = session.date.split('T')[0]; // Extract YYYY-MM-DD
    if (sessionDate < start || sessionDate > end) return false;

    // Check if session is within goal's overall date range
    if (sessionDate < goal.startDate) return false;
    if (goal.endDate && sessionDate > goal.endDate) return false;

    return true;
  });

  // For activity-based goals, filter by activity type
  if (goal.goalType === 'activity_count' && goal.activityType) {
    const matchingSessions = relevantSessions.filter(s => s.type === goal.activityType);
    return matchingSessions.length;
  }

  // For streak-based goals, count all activities
  if (goal.goalType === 'streak') {
    return relevantSessions.length;
  }

  // For custom goals, count all linked activities
  if (goal.goalType === 'custom') {
    const linkedSessions = relevantSessions.filter(s =>
      s.goalIds?.includes(goal.id)
    );
    return linkedSessions.length;
  }

  return 0;
};

/**
 * Update progress for a specific goal, snapshotting the previous period if it has rolled over
 */
export const updateGoalProgress = async (goalId: string): Promise<void> => {
  const goal = await getGoalById(goalId);
  if (!goal) return;

  // Detect period rollover for recurring periods (not custom)
  if (goal.targetPeriod !== 'custom') {
    const currentPeriodRange = getPeriodDateRange(goal.targetPeriod, goal.startDate);
    const lastCalcDate = goal.lastCalculated.split('T')[0];

    // If last calculation was before the current period started, the period has rolled over
    if (lastCalcDate < currentPeriodRange.start) {
      const prevPeriodRange = getPeriodRangeForDate(goal.targetPeriod, lastCalcDate);
      // Only snapshot if the previous period is within the goal's overall date range
      if (prevPeriodRange.start >= goal.startDate) {
        await snapshotGoalPeriod(goal, prevPeriodRange.start, prevPeriodRange.end);
      }
    }
  }

  const progress = await calculateGoalProgress(goal);
  await updateGoal(goalId, {
    currentProgress: progress,
    lastCalculated: new Date().toISOString(),
  });
};

/**
 * Recalculate progress for all active goals
 */
export const recalculateAllGoalProgress = async (): Promise<void> => {
  const goals = await getActiveGoals();
  await Promise.all(goals.map(goal => updateGoalProgress(goal.id)));
};

// ==================== Activity Linking ====================

/**
 * Link an activity to multiple goals
 */
export const linkActivityToGoals = async (sessionId: string, goalIds: string[]): Promise<void> => {
  const sessions = await getAllMovementSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index === -1) return;

  sessions[index].goalIds = goalIds;
  await AsyncStorage.setItem('@reps_movement_sessions', JSON.stringify(sessions));

  // Recalculate progress for linked goals
  await Promise.all(goalIds.map(id => updateGoalProgress(id)));
};

/**
 * Get all activities linked to a goal
 */
export const getActivitiesForGoal = async (goalId: string): Promise<MovementSession[]> => {
  const sessions = await getAllMovementSessions();
  return sessions.filter(s => s.goalIds?.includes(goalId));
};

/**
 * Cleanup: Remove goal ID from all movement sessions
 */
const cleanupDeletedGoalFromSessions = async (goalId: string): Promise<void> => {
  const sessions = await getAllMovementSessions();
  let modified = false;

  const updatedSessions = sessions.map(session => {
    if (session.goalIds?.includes(goalId)) {
      modified = true;
      return {
        ...session,
        goalIds: session.goalIds.filter(id => id !== goalId),
      };
    }
    return session;
  });

  if (modified) {
    await AsyncStorage.setItem('@reps_movement_sessions', JSON.stringify(updatedSessions));
  }
};

// ==================== Period Records ====================

/**
 * Get all goal period records from storage
 */
export const getAllGoalPeriodRecords = async (): Promise<GoalPeriodRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(GOAL_PERIODS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Get all period records for a specific goal, sorted newest first
 */
export const getGoalPeriodRecords = async (goalId: string): Promise<GoalPeriodRecord[]> => {
  const all = await getAllGoalPeriodRecords();
  return all
    .filter(r => r.goalId === goalId)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
};

/**
 * Save a period record (upsert by goalId + periodStart)
 */
export const saveGoalPeriodRecord = async (record: GoalPeriodRecord): Promise<void> => {
  const all = await getAllGoalPeriodRecords();
  const existingIndex = all.findIndex(
    r => r.goalId === record.goalId && r.periodStart === record.periodStart
  );
  if (existingIndex >= 0) {
    all[existingIndex] = record;
  } else {
    all.push(record);
  }
  await AsyncStorage.setItem(GOAL_PERIODS_KEY, JSON.stringify(all));
  Sync.syncGoalPeriodRecord(record);
};

/**
 * Delete all period records for a goal (called when goal is deleted)
 */
export const deleteGoalPeriodRecordsForGoal = async (goalId: string): Promise<void> => {
  const all = await getAllGoalPeriodRecords();
  const filtered = all.filter(r => r.goalId !== goalId);
  await AsyncStorage.setItem(GOAL_PERIODS_KEY, JSON.stringify(filtered));
  Sync.removeGoalPeriodRecordsForGoal(goalId);
};

/**
 * Get the full period date range (start to end) for the period containing a given date
 */
export const getPeriodRangeForDate = (
  period: TargetPeriod,
  dateStr: string
): { start: string; end: string } => {
  // Use noon to avoid timezone edge cases
  const date = new Date(`${dateStr}T12:00:00`);

  switch (period) {
    case 'daily':
      return { start: dateStr, end: dateStr };

    case 'weekly': {
      const dayOfWeek = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - dayOfWeek);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      return {
        start: sunday.toISOString().split('T')[0],
        end: saturday.toISOString().split('T')[0],
      };
    }

    case 'monthly': {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0],
      };
    }

    default:
      return { start: dateStr, end: dateStr };
  }
};

/**
 * Snapshot a goal's current progress for a completed period
 */
const snapshotGoalPeriod = async (
  goal: Goal,
  periodStart: string,
  periodEnd: string
): Promise<void> => {
  // Check if a record already exists for this period (avoid duplicates)
  const existing = await getGoalPeriodRecords(goal.id);
  const alreadyExists = existing.some(r => r.periodStart === periodStart);
  if (alreadyExists) return;

  const record: GoalPeriodRecord = {
    id: `${goal.id}-${periodStart}`,
    goalId: goal.id,
    userId: goal.userId,
    periodStart,
    periodEnd,
    targetPeriod: goal.targetPeriod,
    targetValue: goal.targetValue,
    progress: goal.currentProgress,
    completed: goal.currentProgress >= goal.targetValue,
    createdAt: new Date().toISOString(),
  };

  await saveGoalPeriodRecord(record);
};

// ==================== Helper Functions ====================

/**
 * Generate a goal title based on parameters
 */
export const generateGoalTitle = (
  goalType: GoalType,
  targetValue: number,
  targetPeriod: TargetPeriod,
  activityType?: MovementType
): string => {
  const periodLabels: Record<TargetPeriod, string> = {
    daily: 'per day',
    weekly: 'per week',
    monthly: 'per month',
    custom: '',
  };

  if (goalType === 'activity_count' && activityType) {
    const activityLabels: Record<MovementType, string> = {
      strength_training: 'Strength Training',
      walking: 'Walking',
      running: 'Running',
      stretching: 'Stretching',
      sports_and_play: 'Sports & Play',
      cycling: 'Cycling',
      yoga: 'Yoga',
      other: 'Activities',
      rest_day: 'Rest Days',
    };

    const activityLabel = activityLabels[activityType] || activityType;
    const times = targetValue === 1 ? 'time' : 'times';
    return `${activityLabel} ${targetValue} ${times} ${periodLabels[targetPeriod]}`;
  }

  if (goalType === 'streak') {
    const days = targetValue === 1 ? 'day' : 'days';
    return `${targetValue}-${days} Activity Streak`;
  }

  return `Custom Goal`;
};

/**
 * Check if goal is completed
 */
export const isGoalCompleted = (goal: Goal): boolean => {
  return goal.currentProgress >= goal.targetValue;
};

/**
 * Get goal completion percentage (0-100)
 */
export const getGoalCompletionPercentage = (goal: Goal): number => {
  if (goal.targetValue === 0) return 0;
  const percentage = (goal.currentProgress / goal.targetValue) * 100;
  return Math.min(Math.round(percentage), 100);
};

/**
 * Get progress display text
 */
export const getGoalProgressText = (goal: Goal): string => {
  const periodLabels: Record<TargetPeriod, string> = {
    daily: 'today',
    weekly: 'this week',
    monthly: 'this month',
    custom: '',
  };

  return `${goal.currentProgress}/${goal.targetValue} ${periodLabels[goal.targetPeriod]}`;
};
