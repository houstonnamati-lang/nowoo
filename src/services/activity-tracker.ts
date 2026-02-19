import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { scheduleInactivityReminder, cancelInactivityReminder } from "./notifications";

const LAST_ACTIVITY_KEY = "last-activity-timestamp";
const INACTIVITY_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

let activityTrackerInitialized = false;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Records the current time as the last activity timestamp
 */
export async function recordActivity(): Promise<void> {
  const timestamp = Date.now();
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
  // Cancel any scheduled inactivity reminder since user is active
  await cancelInactivityReminder();
}

/**
 * Gets the last activity timestamp
 */
export async function getLastActivity(): Promise<number | null> {
  const timestampStr = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
  return timestampStr ? parseInt(timestampStr, 10) : null;
}

/**
 * Checks if user has been inactive for 12+ hours
 */
export async function isInactive(): Promise<boolean> {
  const lastActivity = await getLastActivity();
  if (!lastActivity) return true; // No activity recorded = inactive
  
  const timeSinceActivity = Date.now() - lastActivity;
  return timeSinceActivity >= INACTIVITY_THRESHOLD_MS;
}

/**
 * Initializes activity tracking - records activity on app open and when app comes to foreground
 */
export function initializeActivityTracker(): void {
  if (activityTrackerInitialized) return;
  activityTrackerInitialized = true;

  // Record activity on initial load
  recordActivity();

  // Track app state changes
  const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      // App came to foreground - record activity
      recordActivity();
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

/**
 * Checks inactivity status and schedules reminder if needed
 * Call this when app starts or comes to foreground
 */
export async function checkAndScheduleInactivityReminder(): Promise<void> {
  const inactive = await isInactive();
  if (inactive) {
    // User has been inactive - schedule reminder for 12 hours from now
    await scheduleInactivityReminder();
  } else {
    // User is active - cancel any scheduled reminder
    await cancelInactivityReminder();
  }
}
