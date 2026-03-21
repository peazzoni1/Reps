import * as Notifications from 'expo-notifications';
import { MovementSession } from '../types';
import { generatePostWorkoutMessage, generateDailyRecapMessage } from './anthropic';
import { getRecentDailySnapshots, toLocalDateStr } from './storage';

const POST_WORKOUT_NOTIFICATION_ID = 'post-workout-coach';
const DAILY_RECAP_NOTIFICATION_ID = 'daily-recap';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function getNotificationTime(fromNow: Date): Date {
  // TODO: restore 3-hour delay + 9pm cap for production
  return new Date(fromNow.getTime() + 1 * 60 * 1000); // 1 min for testing
}

function getNext8PMTime(): Date {
  const now = new Date();
  const next8PM = new Date();
  next8PM.setHours(20, 0, 0, 0); // 8:00 PM

  // If it's already past 8 PM today, schedule for tomorrow
  if (now.getTime() >= next8PM.getTime()) {
    next8PM.setDate(next8PM.getDate() + 1);
  }

  return next8PM;
}

export async function schedulePostWorkoutNotification(session: MovementSession): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.cancelScheduledNotificationAsync(POST_WORKOUT_NOTIFICATION_ID).catch(() => {});

  const message = await generatePostWorkoutMessage(session);
  if (!message) return;

  const triggerDate = getNotificationTime(new Date());

  await Notifications.scheduleNotificationAsync({
    identifier: POST_WORKOUT_NOTIFICATION_ID,
    content: {
      title: message.title,
      body: message.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function scheduleDailyRecapNotification(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Cancel any existing daily recap notification
  await Notifications.cancelScheduledNotificationAsync(DAILY_RECAP_NOTIFICATION_ID).catch(() => {});

  const triggerDate = getNext8PMTime();

  // Use a static friendly reminder since we can't generate dynamic content at trigger time
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_RECAP_NOTIFICATION_ID,
    content: {
      title: "End of day check-in",
      body: "Take a moment to log anything you might have missed today.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      repeats: true,
    },
  });
}

export async function cancelDailyRecapNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_RECAP_NOTIFICATION_ID).catch(() => {});
}
