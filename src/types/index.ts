export interface Exercise {
  name: string;
}

export interface Template {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface ExerciseInstance {
  name: string;
  weight?: number;
  reps?: number;
  sets?: number;
  tags?: string[];
  notes?: string;
}

export interface WorkoutInstance {
  id: string;
  templateId: string;
  date: string;
  exercises: ExerciseInstance[];
}

export type MovementType = 'lifted' | 'walked' | 'ran' | 'stretched' | 'played' | 'moved';
export type FeelingType = 'strong' | 'alive' | 'peaceful' | 'heavy' | 'grinding' | 'easy' | 'rough';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
}

export interface MovementSession {
  id: string;
  type: MovementType;
  feeling: FeelingType;
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
