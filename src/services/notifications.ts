import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

  // Configure notification channel for Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2d3748",
    });
  }

  return true;
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
      sound: true,
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
