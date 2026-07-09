import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { useStreakStore } from "@nowoo/stores/streak";
import { scheduleInactivityReminders, cancelInactivityReminders } from "./notifications";

const LAST_ACTIVITY_KEY = "last-activity-timestamp";

let activityTrackerInitialized = false;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Gets the last completed breathwork timestamp
 */
export async function getLastActivity(): Promise<number | null> {
  const timestampStr = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
  return timestampStr ? parseInt(timestampStr, 10) : null;
}

/**
 * Called when a breathwork session is completed. Cancels pending reminders,
 * records the completion time, and schedules the next inactivity reminders.
 */
export async function recordBreathworkCompleted(): Promise<void> {
  const timestamp = Date.now();
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
  await cancelInactivityReminders();

  try {
    await scheduleInactivityReminders(timestamp);
  } catch (error) {
    console.warn("Failed to schedule inactivity reminders", error);
  }
}

/**
 * Keeps streak state in sync when the app returns to the foreground.
 */
export function initializeActivityTracker(): void {
  if (activityTrackerInitialized) return;
  activityTrackerInitialized = true;

  useStreakStore.getState().refreshForToday();

  const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      useStreakStore.getState().refreshForToday();
    }
  });

  appStateSubscription = {
    remove: () => {
      subscription.remove();
    },
  };
}

/**
 * Cleans up activity tracker
 */
export function cleanupActivityTracker(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  activityTrackerInitialized = false;
}
