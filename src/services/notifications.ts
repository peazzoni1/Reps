import * as Notifications from 'expo-notifications';
import { MovementSession } from '../types';
import { generatePostWorkoutMessage } from './anthropic';

const NOTIFICATION_ID = 'post-workout-coach';

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

export async function schedulePostWorkoutNotification(session: MovementSession): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {});

  const message = await generatePostWorkoutMessage(session);
  if (!message) return;

  const triggerDate = getNotificationTime(new Date());

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
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
