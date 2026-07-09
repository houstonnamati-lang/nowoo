import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { saveUserPushToken } from "@nowoo/services/push-token-firestore";
import { useSettingsStore } from "@nowoo/stores/settings";
import { getActiveScheduleCategory } from "@nowoo/utils/schedule-utils";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const INACTIVITY_NOTIFICATION_ID_PREFIX = "inactivity-reminder";
const LEGACY_INACTIVITY_NOTIFICATION_ID = "inactivity-reminder";
const INITIAL_INACTIVITY_DELAY_MS = 12 * 60 * 60 * 1000;
const INACTIVITY_REPEAT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_INACTIVITY_REMINDERS = 30;
/** Custom sound: same bell as in-app (cuebell1). Must match file in app.json expo-notifications sounds. */
const NOTIFICATION_SOUND = "cuebell1.mp3";
const DEFAULT_NOTIFICATION_BODY = "Tap to open";

function getExpoProjectId(): string | undefined {
  const expoConfig = (Constants as any).expoConfig ?? {};
  return expoConfig.extra?.eas?.projectId ?? expoConfig.extra?.eas?.projectID;
}

function hasAnyScheduleConfigured(): boolean {
  const state = useSettingsStore.getState();
  return Boolean(
    (state.scheduleRiseStartTime && state.scheduleRiseEndTime) ||
      (state.scheduleResetStartTime && state.scheduleResetEndTime) ||
      (state.scheduleRestoreStartTime && state.scheduleRestoreEndTime)
  );
}

export function getInactivityNotificationContent(fireDate: Date): {
  title: string;
  body: string;
} {
  if (!hasAnyScheduleConfigured()) {
    return { title: "Time to Breathe", body: DEFAULT_NOTIFICATION_BODY };
  }

  const state = useSettingsStore.getState();
  const category = getActiveScheduleCategory(
    state.scheduleRiseStartTime,
    state.scheduleRiseEndTime,
    state.scheduleResetStartTime,
    state.scheduleResetEndTime,
    state.scheduleRestoreStartTime,
    state.scheduleRestoreEndTime,
    fireDate
  );

  switch (category) {
    case "rise":
      return { title: "Time to Rise", body: DEFAULT_NOTIFICATION_BODY };
    case "reset":
      return { title: "Time to Reset", body: DEFAULT_NOTIFICATION_BODY };
    case "restore":
      return { title: "Time to Restore", body: DEFAULT_NOTIFICATION_BODY };
    default:
      return { title: "Time to Breathe", body: DEFAULT_NOTIFICATION_BODY };
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Notification permissions not granted");
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2d3748",
      sound: NOTIFICATION_SOUND,
    });
  }

  return true;
}

export async function registerUserForPushNotifications(userId: string): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const projectId = getExpoProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const expoPushToken = tokenResponse.data;

  await saveUserPushToken(userId, expoPushToken);

  return expoPushToken;
}

/**
 * Schedules local inactivity reminders: first after 12h, then every 24h after that.
 * Titles follow the user's Rise/Reset/Restore schedule at each fire time.
 */
export async function scheduleInactivityReminders(lastActivityMs: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await cancelInactivityReminders();

  const now = Date.now();

  for (let i = 0; i < MAX_INACTIVITY_REMINDERS; i++) {
    const fireAt = lastActivityMs + INITIAL_INACTIVITY_DELAY_MS + i * INACTIVITY_REPEAT_INTERVAL_MS;
    if (fireAt <= now) continue;

    const fireDate = new Date(fireAt);
    const { title, body } = getInactivityNotificationContent(fireDate);

    await Notifications.scheduleNotificationAsync({
      identifier: `${INACTIVITY_NOTIFICATION_ID_PREFIX}-${i}`,
      content: {
        title,
        body,
        sound: NOTIFICATION_SOUND,
        data: { type: "inactivity", reminderIndex: i },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}

export async function cancelInactivityReminders(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(LEGACY_INACTIVITY_NOTIFICATION_ID).catch(
    () => {}
  );

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(INACTIVITY_NOTIFICATION_ID_PREFIX))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );
}

/** @deprecated Use cancelInactivityReminders */
export async function cancelInactivityReminder(): Promise<void> {
  await cancelInactivityReminders();
}

/** @deprecated Use scheduleInactivityReminders */
export async function scheduleInactivityReminder(): Promise<void> {
  await scheduleInactivityReminders(Date.now());
}

export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
