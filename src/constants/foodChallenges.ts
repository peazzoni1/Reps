import { FoodChallenge } from '../types';

export const FOOD_CHALLENGES: FoodChallenge[] = [
  // Hydration (6)
  { id: 'fc_01', text: 'Drink at least 3 glasses of water today', category: 'hydration', icon: '💧' },
  { id: 'fc_02', text: 'Start your morning with a glass of water before coffee', category: 'hydration', icon: '💧' },
  { id: 'fc_03', text: 'Have a glass of water with every meal today', category: 'hydration', icon: '💧' },
  { id: 'fc_04', text: 'Swap one drink today for a glass of water', category: 'hydration', icon: '💧' },
  { id: 'fc_05', text: 'Drink a full glass of water before each meal', category: 'hydration', icon: '💧' },
  { id: 'fc_06', text: 'Finish a full bottle of water before noon', category: 'hydration', icon: '💧' },

  // Fruits (6)
  { id: 'fc_07', text: 'Enjoy some fruit today', category: 'fruits', icon: '🍎' },
  { id: 'fc_08', text: 'Have fruit as a snack instead of something packaged', category: 'fruits', icon: '🍓' },
  { id: 'fc_09', text: 'Add fruit to your breakfast today', category: 'fruits', icon: '🍌' },
  { id: 'fc_10', text: 'Try a fruit you haven\'t eaten this week', category: 'fruits', icon: '🍊' },
  { id: 'fc_11', text: 'Eat two different fruits today', category: 'fruits', icon: '🍇' },
  { id: 'fc_12', text: 'Include a whole piece of fruit with lunch', category: 'fruits', icon: '🍐' },

  // Vegetables (6)
  { id: 'fc_13', text: 'Add a vegetable to one of your meals today', category: 'vegetables', icon: '🥦' },
  { id: 'fc_14', text: 'Eat something green today', category: 'vegetables', icon: '🥬' },
  { id: 'fc_15', text: 'Include a vegetable at dinner tonight', category: 'vegetables', icon: '🥕' },
  { id: 'fc_16', text: 'Snack on raw vegetables today', category: 'vegetables', icon: '🥒' },
  { id: 'fc_17', text: 'Try a vegetable you don\'t eat often', category: 'vegetables', icon: '🫑' },
  { id: 'fc_18', text: 'Make half your plate vegetables at one meal', category: 'vegetables', icon: '🥗' },

  // Mindful eating (6)
  { id: 'fc_19', text: 'Cook one meal at home today', category: 'mindful', icon: '🍳' },
  { id: 'fc_20', text: 'Sit down without screens for at least one meal', category: 'mindful', icon: '🧘' },
  { id: 'fc_21', text: 'Take your time and eat one meal slowly today', category: 'mindful', icon: '🌿' },
  { id: 'fc_22', text: 'Don\'t skip breakfast today — even something small', category: 'mindful', icon: '☀️' },
  { id: 'fc_23', text: 'Plate your food before eating instead of eating from the container', category: 'mindful', icon: '🍽️' },
  { id: 'fc_24', text: 'Pause between bites and put your fork down a few times', category: 'mindful', icon: '🌿' },

  // Variety & gut health (6)
  { id: 'fc_25', text: 'Eat something fermented today — yogurt, kefir, or kombucha', category: 'variety', icon: '🫙' },
  { id: 'fc_26', text: 'Have a fiber-rich food today — oats, beans, or whole grain', category: 'variety', icon: '🌾' },
  { id: 'fc_27', text: 'Try a plant-based protein today — beans, lentils, or tofu', category: 'variety', icon: '🫘' },
  { id: 'fc_28', text: 'Include a protein source at breakfast', category: 'variety', icon: '🥚' },
  { id: 'fc_29', text: 'Add a handful of nuts or seeds to a meal or snack', category: 'variety', icon: '🥜' },
  { id: 'fc_30', text: 'Eat something you prepared yourself today', category: 'variety', icon: '👨‍🍳' },
];

/**
 * Returns a deterministic challenge for a given YYYY-MM-DD date string.
 * The same date always returns the same challenge for all users.
 */
export function getChallengeForDate(dateStr: string): FoodChallenge {
  const hash = dateStr.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const index = hash % FOOD_CHALLENGES.length;
  return FOOD_CHALLENGES[index];
}
