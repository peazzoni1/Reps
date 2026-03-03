export type MovementType = 'strength_training' | 'walking' | 'running' | 'stretching' | 'sports_and_play' | 'other' | 'cycling' | 'yoga';
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
