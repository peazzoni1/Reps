// Time-based greetings with multiple options per time slot
const GREETINGS = {
  earlyMorning: [
    'Early one today.',
    'Up before the sun.',
    'Quiet morning.',
    'Beat the alarm.',
  ],
  morning: [
    'Morning.',
    'Good morning.',
    'Fresh start.',
    'New day.',
  ],
  midday: [
    'Midday break?',
    'Lunchtime move?',
    'Middle of the day.',
    'Halfway through.',
  ],
  afternoon: [
    'Afternoon.',
    'Got anything left in the tank?',
    'Afternoon session?',
    'Still going.',
  ],
  evening: [
    'Still time.',
    'Evening.',
    'Winding down or gearing up?',
    'End of day.',
  ],
  night: [
    'Late one.',
    'Night owl.',
    'Burning the midnight oil.',
    'After hours.',
  ],
};

type TimeSlot = keyof typeof GREETINGS;

// Get random item from array
const randomItem = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Get time slot based on current hour
const getTimeSlot = (hour: number): TimeSlot => {
  if (hour < 7) return 'earlyMorning';
  if (hour < 11) return 'morning';
  if (hour < 13) return 'midday';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
};

// Get base greeting (Layer 1)
export const getTimeGreeting = (): string => {
  const now = new Date();
  const hour = now.getHours();
  const timeSlot = getTimeSlot(hour);
  return randomItem(GREETINGS[timeSlot]);
};

// Format weather condition for natural speech
const formatWeatherCondition = (temp: number, condition?: string): string => {
  const isVeryCold = temp < 32;
  const isCold = temp < 45;
  const isHot = temp > 85;
  const isVeryHot = temp > 95;

  // Temperature + interesting conditions
  if (condition) {
    const lowerCondition = condition.toLowerCase();

    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return `${temp}° and raining.`;
    }

    if (lowerCondition.includes('snow')) {
      return `${temp}° and snowing.`;
    }

    if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) {
      return `${temp}° and stormy.`;
    }

    if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
      return `${temp}° and foggy.`;
    }

    if (lowerCondition.includes('clear') && (temp > 65 && temp < 80)) {
      return `Nice day — ${temp}° and clear.`;
    }
  }

  // Temperature-based descriptors
  if (isVeryCold) {
    return `It's cold. ${temp}°.`;
  }

  if (isCold) {
    return `${temp}° and crisp out there.`;
  }

  if (isVeryHot) {
    return `${temp}° and brutal.`;
  }

  if (isHot) {
    return `Warming up — ${temp}°.`;
  }

  // Default: just show temp if nothing particularly interesting
  if (temp < 55 || temp > 75) {
    return `${temp}° outside.`;
  }

  return `${temp}°.`;
};

// Combine greeting with weather (Layer 1 + Layer 2)
export const getGreetingWithWeather = (temperature?: number, condition?: string): string => {
  const baseGreeting = getTimeGreeting();

  if (temperature === undefined) {
    return baseGreeting;
  }

  const weatherClause = formatWeatherCondition(Math.round(temperature), condition);
  return `${baseGreeting} ${weatherClause}`;
};
