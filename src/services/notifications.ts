import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { saveUserPushToken } from "@nowoo/services/push-token-firestore";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const INACTIVITY_NOTIFICATION_ID = "inactivity-reminder";
const INACTIVITY_DELAY_HOURS = 12;
/** Custom sound: same bell as in-app (cuebell1). Must match file in app.json expo-notifications sounds. */
const NOTIFICATION_SOUND = "cuebell1.mp3";

function getExpoProjectId(): string | undefined {
  // Prefer explicit projectId when available (required for some dev environments)
  const expoConfig = (Constants as any).expoConfig ?? {};
  return expoConfig.extra?.eas?.projectId ?? expoConfig.extra?.eas?.projectID;
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

  // Configure notification channel for Android (custom sound for Android 8+)
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

export async function scheduleInactivityReminder(): Promise<void> {
  // Cancel any existing inactivity reminder
  await Notifications.cancelScheduledNotificationAsync(INACTIVITY_NOTIFICATION_ID);

  // Schedule new reminder for 12 hours from now
  const trigger = {
    seconds: INACTIVITY_DELAY_HOURS * 60 * 60, // 12 hours in seconds
  };

  await Notifications.scheduleNotificationAsync({
    identifier: INACTIVITY_NOTIFICATION_ID,
    content: {
      title: "Time to breathe",
      body: "You haven't practiced in a while. Take a moment to breathe.",
      sound: NOTIFICATION_SOUND,
      data: { type: "inactivity" },
    },
    trigger,
  });
}

export async function cancelInactivityReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(INACTIVITY_NOTIFICATION_ID);
}

export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
