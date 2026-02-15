import { SeasonType, MovementType, FeelingType, SeasonTheme } from '../types';

export const SEASONS: Record<SeasonType, SeasonTheme> = {
  spring: {
    name: 'Spring',
    theme: 'Growth',
    color: '#4a7c59',
    accent: '#8fbc8f',
    bgStart: '#f0f7f0',
    bgMiddle: '#e8f5e0',
    bgEnd: '#d4edda',
    cardBg: 'rgba(255,255,255,0.7)',
    text: '#2d4a35',
    textSecondary: '#5a7d62',
    prompt: 'What new movement wants to find you today?',
    philosophy: 'A season for trying, exploring, beginning again.',
  },
  summer: {
    name: 'Summer',
    theme: 'Peak',
    color: '#c4652e',
    accent: '#e8a87c',
    bgStart: '#fef9f0',
    bgMiddle: '#fdf0e0',
    bgEnd: '#fce4c8',
    cardBg: 'rgba(255,255,255,0.65)',
    text: '#4a2f1a',
    textSecondary: '#8a6240',
    prompt: 'Your body is ready. What calls to you?',
    philosophy: 'A season of strength, consistency, and fire.',
  },
  autumn: {
    name: 'Autumn',
    theme: 'Harvest',
    color: '#8b5e3c',
    accent: '#c4956a',
    bgStart: '#faf6f0',
    bgMiddle: '#f0e8dc',
    bgEnd: '#e8dcc8',
    cardBg: 'rgba(255,255,255,0.6)',
    text: '#3d2e1e',
    textSecondary: '#7a6248',
    prompt: 'What did your body teach you this week?',
    philosophy: 'A season to reflect, gather, and appreciate the work.',
  },
  winter: {
    name: 'Winter',
    theme: 'Rest',
    color: '#5a6d7a',
    accent: '#8fa3b0',
    bgStart: '#f2f4f6',
    bgMiddle: '#e4e8ec',
    bgEnd: '#d6dce2',
    cardBg: 'rgba(255,255,255,0.55)',
    text: '#2a3540',
    textSecondary: '#5e7080',
    prompt: 'Gentle movement is still movement.',
    philosophy: 'A season for rest, recovery, and quiet strength.',
  },
};

export const MOVEMENT_TYPES: Array<{ id: MovementType; label: string; icon: string }> = [
  { id: 'lifted', label: 'Lifted', icon: '◆' },
  { id: 'walked', label: 'Walked', icon: '↗' },
  { id: 'ran', label: 'Ran', icon: '»' },
  { id: 'stretched', label: 'Stretched', icon: '~' },
  { id: 'played', label: 'Played', icon: '○' },
  { id: 'moved', label: 'Moved', icon: '∿' },
];

export const FEELINGS: Array<{ id: FeelingType; label: string }> = [
  { id: 'strong', label: 'Strong' },
  { id: 'alive', label: 'Alive' },
  { id: 'peaceful', label: 'Peaceful' },
  { id: 'heavy', label: 'Heavy' },
  { id: 'grinding', label: 'Grinding' },
  { id: 'easy', label: 'Easy' },
  { id: 'rough', label: 'Rough' },
];

export function getCurrentSeason(): SeasonType {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function getDayLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
}

export function getMovementIcon(typeId: MovementType): string {
  return MOVEMENT_TYPES.find((m) => m.id === typeId)?.icon || '·';
}

export function getSeasonDay(): { currentDay: number; totalDays: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  // Determine season start date and total days
  let seasonStart: Date;
  let totalDays: number;

  if (month >= 2 && month <= 4) {
    // Spring: March 1 - May 31 (Mar: 31, Apr: 30, May: 31)
    seasonStart = new Date(year, 2, 1);
    totalDays = 92;
  } else if (month >= 5 && month <= 7) {
    // Summer: June 1 - Aug 31 (Jun: 30, Jul: 31, Aug: 31)
    seasonStart = new Date(year, 5, 1);
    totalDays = 92;
  } else if (month >= 8 && month <= 10) {
    // Autumn: September 1 - Nov 30 (Sep: 30, Oct: 31, Nov: 30)
    seasonStart = new Date(year, 8, 1);
    totalDays = 91;
  } else {
    // Winter: December 1 - Feb 28/29 (Dec: 31, Jan: 31, Feb: 28/29)
    // If we're in Jan/Feb, the season started last December
    if (month === 0 || month === 1) {
      seasonStart = new Date(year - 1, 11, 1);
      // Check if this is a leap year (affects Feb days)
      const febDays = new Date(year, 2, 0).getDate(); // Last day of Feb
      totalDays = 62 + febDays; // Dec (31) + Jan (31) + Feb (28 or 29)
    } else {
      seasonStart = new Date(year, 11, 1);
      // Check if next year is a leap year
      const febDays = new Date(year + 1, 2, 0).getDate();
      totalDays = 62 + febDays;
    }
  }

  // Calculate days since season start
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Day 1 is the first day of the season
  return {
    currentDay: diffDays + 1,
    totalDays,
  };
}
