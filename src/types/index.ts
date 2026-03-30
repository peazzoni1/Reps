export type MovementType = 'strength_training' | 'walking' | 'running' | 'stretching' | 'sports_and_play' | 'other' | 'cycling' | 'yoga' | 'rest_day';
export type FeelingType = 'strong' | 'alive' | 'peaceful' | 'heavy' | 'grinding' | 'easy' | 'rough' | 'tired';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
}

export interface MovementSession {
  id: string;
  type: MovementType;
  feelings: FeelingType[];
  label: string;
  date: string;
  note?: string;
  workoutDetails?: WorkoutExercise[];
  goalIds?: string[];
}

export interface SeasonTheme {
  name: string;
  theme: string;
  color: string;
  accent: string;
  bgStart: string;
  bgMiddle: string;
  bgEnd: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  prompt: string;
  philosophy: string;
}

export interface FoodEntry {
  id: string;
  date: string;
  description: string;
  meal?: MealType;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type MemoryType = 'persistent' | 'contextual';

export interface MemoryBullet {
  text: string;
  memoryType: MemoryType;
}

export interface CoachSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  messages: ChatMessage[];
  memorySummary: MemoryBullet[] | null;
}

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  exercises: MovementSession[];
  food: FoodEntry[];
}

// Subscription types
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'grace_period';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  isActive: boolean;
}

// Daily check-in quota types
export interface CheckInQuota {
  remaining: number;
  total: number;
  weekStartDate: string; // YYYY-MM-DD (Sunday)
  isPremium: boolean;
}

// Goals types
export type GoalType = 'activity_count' | 'streak' | 'custom';
export type TargetPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  goalType: GoalType;
  targetValue: number;
  targetPeriod: TargetPeriod;
  activityType?: MovementType;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  currentProgress: number;
  lastCalculated: string;
}

// Progress screen types
export type AchievementType = 'pr' | 'streak' | 'milestone' | 'consistency';

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  date: string;
  icon: string;
  exercise?: string; // For PR achievements
  value?: number; // For PR values
}

export interface WeeklySummary {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  text: string; // AI-generated summary text
  workoutCount: number;
  currentStreak: number;
  topCategory: string | null;
  totalMinutes: number;
  topFeeling: FeelingType | null;
}

export interface PatternData {
  workoutFrequency: { date: string; count: number }[];
  exerciseDistribution: { category: string; percentage: number }[];
  feelingTrends: { feeling: FeelingType; count: number }[];
  strengthProgression: { exercise: string; data: { date: string; weight: number }[] }[];
}
