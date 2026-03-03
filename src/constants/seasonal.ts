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
    color: '#1A5276',
    accent: '#5BA4CF',
    bgStart: '#f2f4f6',
    bgMiddle: '#e4e8ec',
    bgEnd: '#d6dce2',
    cardBg: 'rgba(255,255,255,0.55)',
    text: '#1a3445',
    textSecondary: '#4a6d85',
    prompt: '',
    philosophy: 'A season for rest, recovery, and quiet strength.',
  },
};

export const MOVEMENT_TYPES: Array<{ id: MovementType; label: string; icon: string }> = [
  { id: 'strength_training', label: 'Strength Training', icon: '◆' },
  { id: 'walking', label: 'Walking', icon: '↗' },
  { id: 'running', label: 'Running', icon: '»' },
  { id: 'stretching', label: 'Stretching', icon: '~' },
  { id: 'sports_and_play', label: 'Sports & Play', icon: '○' },
  { id: 'cycling', label: 'Cycling', icon: '⟳' },
  { id: 'yoga', label: 'Yoga', icon: '⌘' },
  { id: 'other', label: 'Other', icon: '∿' },
];

export const FEELINGS: Array<{ id: FeelingType; label: string }> = [
  { id: 'strong', label: 'Strong' },
  { id: 'alive', label: 'Alive' },
  { id: 'peaceful', label: 'Peaceful' },
  { id: 'heavy', label: 'Heavy' },
  { id: 'grinding', label: 'Grinding' },
  { id: 'easy', label: 'Easy' },
  { id: 'rough', label: 'Rough' },
  { id: 'tired', label: 'Tired' },
];

// ─── Season blending ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.round(v).toString(16).padStart(2, '0'))
    .join('');
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function lerpCardBg(a: string, b: string, t: number): string {
  const alphaA = parseFloat(a.match(/[\d.]+(?=\))/)?.[0] ?? '0.6');
  const alphaB = parseFloat(b.match(/[\d.]+(?=\))/)?.[0] ?? '0.6');
  const alpha = alphaA + (alphaB - alphaA) * t;
  return `rgba(255,255,255,${alpha.toFixed(2)})`;
}

/**
 * Returns the current season's theme, gradually blending toward the next
 * season's palette in the final 40% of the season (up to 45% blend max).
 * This gives a subtle "transitional" feel as the season comes to a close.
 */
export function getBlendedTheme(): SeasonTheme {
  const currentSeasonType = getCurrentSeason();
  const { currentDay, totalDays } = getSeasonDay();
  const progress = currentDay / totalDays;

  const BLEND_START = 0.60; // start mixing at 60% through the season
  const MAX_BLEND = 0.45;   // never fully become the next season

  let t = 0;
  if (progress > BLEND_START) {
    t = ((progress - BLEND_START) / (1 - BLEND_START)) * MAX_BLEND;
  }

  const current = SEASONS[currentSeasonType];
  if (t === 0) return current;

  const seasonOrder: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
  const nextSeasonType = seasonOrder[(seasonOrder.indexOf(currentSeasonType) + 1) % 4];
  const next = SEASONS[nextSeasonType];

  return {
    name: current.name,
    theme: current.theme,
    prompt: current.prompt,
    philosophy: current.philosophy,
    color:         lerpColor(current.color, next.color, t),
    accent:        lerpColor(current.accent, next.accent, t),
    bgStart:       lerpColor(current.bgStart, next.bgStart, t),
    bgMiddle:      lerpColor(current.bgMiddle, next.bgMiddle, t),
    bgEnd:         lerpColor(current.bgEnd, next.bgEnd, t),
    cardBg:        lerpCardBg(current.cardBg, next.cardBg, t),
    text:          lerpColor(current.text, next.text, t),
    textSecondary: lerpColor(current.textSecondary, next.textSecondary, t),
  };
}

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
