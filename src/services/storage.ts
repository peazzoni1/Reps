import AsyncStorage from '@react-native-async-storage/async-storage';
import { Template, WorkoutInstance, MovementSession, MovementType, FeelingType, WorkoutExercise } from '../types';

const TEMPLATES_KEY = '@reps_templates';
const WORKOUTS_KEY = '@reps_workouts';
const MOVEMENT_SESSIONS_KEY = '@reps_movement_sessions';

// Helper function to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Template Operations
export const createTemplate = async (name: string, exercises: { name: string }[]): Promise<Template> => {
  const templates = await getAllTemplates();
  const newTemplate: Template = {
    id: generateId(),
    name,
    exercises,
  };
  templates.push(newTemplate);
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
};

export const getTemplate = async (id: string): Promise<Template | null> => {
  const templates = await getAllTemplates();
  return templates.find(t => t.id === id) || null;
};

export const getAllTemplates = async (): Promise<Template[]> => {
  try {
    const data = await AsyncStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading templates:', error);
    return [];
  }
};

export const updateTemplate = async (id: string, updates: Partial<Omit<Template, 'id'>>): Promise<Template | null> => {
  const templates = await getAllTemplates();
  const index = templates.findIndex(t => t.id === id);

  if (index === -1) return null;

  templates[index] = { ...templates[index], ...updates };
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates[index];
};

export const deleteTemplate = async (id: string): Promise<boolean> => {
  const templates = await getAllTemplates();
  const filtered = templates.filter(t => t.id !== id);

  if (filtered.length === templates.length) return false;

  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
};

// Workout Operations
export const createWorkout = async (
  templateId: string,
  exercises: WorkoutInstance['exercises']
): Promise<WorkoutInstance> => {
  const workouts = await getAllWorkouts();
  const newWorkout: WorkoutInstance = {
    id: generateId(),
    templateId,
    date: new Date().toISOString(),
    exercises,
  };
  workouts.push(newWorkout);
  await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
  return newWorkout;
};

export const getWorkout = async (id: string): Promise<WorkoutInstance | null> => {
  const workouts = await getAllWorkouts();
  return workouts.find(w => w.id === id) || null;
};

export const getAllWorkouts = async (): Promise<WorkoutInstance[]> => {
  try {
    const data = await AsyncStorage.getItem(WORKOUTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading workouts:', error);
    return [];
  }
};

export const getRecentWorkouts = async (limit: number = 10): Promise<WorkoutInstance[]> => {
  const workouts = await getAllWorkouts();
  return workouts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
};

export const updateWorkout = async (
  id: string,
  updates: Partial<Omit<WorkoutInstance, 'id'>>
): Promise<WorkoutInstance | null> => {
  const workouts = await getAllWorkouts();
  const index = workouts.findIndex(w => w.id === id);

  if (index === -1) return null;

  workouts[index] = { ...workouts[index], ...updates };
  await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
  return workouts[index];
};

export const deleteWorkout = async (id: string): Promise<boolean> => {
  const workouts = await getAllWorkouts();
  const filtered = workouts.filter(w => w.id !== id);

  if (filtered.length === workouts.length) return false;

  await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(filtered));
  return true;
};

// Movement Session Operations
export const createMovementSession = async (
  type: MovementType,
  feeling: FeelingType,
  label: string,
  note?: string,
  workoutDetails?: WorkoutExercise[]
): Promise<MovementSession> => {
  const sessions = await getAllMovementSessions();
  const newSession: MovementSession = {
    id: generateId(),
    type,
    feeling,
    label,
    date: new Date().toISOString(),
    note,
    workoutDetails,
  };
  sessions.push(newSession);
  await AsyncStorage.setItem(MOVEMENT_SESSIONS_KEY, JSON.stringify(sessions));
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

export const deleteMovementSession = async (id: string): Promise<boolean> => {
  const sessions = await getAllMovementSessions();
  const filtered = sessions.filter(s => s.id !== id);

  if (filtered.length === sessions.length) return false;

  await AsyncStorage.setItem(MOVEMENT_SESSIONS_KEY, JSON.stringify(filtered));
  return true;
};

// Utility function to clear all data (useful for development/testing)
export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([TEMPLATES_KEY, WORKOUTS_KEY, MOVEMENT_SESSIONS_KEY]);
};
