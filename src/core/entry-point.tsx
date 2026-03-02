import * as Font from "expo-font";
import { useColorScheme } from "nativewind";
import React, { FC, useEffect } from "react";
import { Platform, UIManager, View, LayoutAnimation } from "react-native";
import { fonts as fontAssets } from "@nowoo/assets/fonts";
import { Navigator } from "@nowoo/core/navigator";
import { useHydration, useSettingsStore } from "@nowoo/stores/settings";
import { useAuthStore } from "@nowoo/stores/auth";
import { useStreakStore } from "@nowoo/stores/streak";
import { getFirebaseAuth } from "@nowoo/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { loadUserStreak, saveUserStreak } from "@nowoo/services/streak-firestore";
import {
  initializeImmersiveMode,
  useStickyImmersiveReset,
} from "@nowoo/utils/use-sticky-immersive-reset";
import { useThemedStatusBar } from "@nowoo/utils/use-themed-status-bar";
import { SplashScreenManager } from "./splash-screen-manager";
import { initializeActivityTracker, checkAndScheduleInactivityReminder } from "@nowoo/services/activity-tracker";
import { requestNotificationPermissions } from "@nowoo/services/notifications";

// Enable layout animations on Android so that we can animate views to their new
// positions when a layout change happens
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

initializeImmersiveMode();

// App entry point used to wrap the core logic of the app with context providers
export const EntryPoint: FC = () => {
  return (
    <SplashScreenManager>
      <Main />
    </SplashScreenManager>
  );
};

// Initializes the app state and, once done, hides the splash screen and shows
// the AppRouter
const Main: FC = () => {
  const { setColorScheme } = useColorScheme();
  const [areFontsLoaded] = Font.useFonts(fontAssets);
  const theme = useSettingsStore((state) => state.theme);
  const shouldFollowSystemDarkMode = useSettingsStore((state) => state.shouldFollowSystemDarkMode);
  const hydrated = useHydration();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const hydrateFromRemote = useStreakStore((state) => state.hydrateFromRemote);
  const clearForSignOut = useStreakStore((state) => state.clearForSignOut);
  const getStreakData = useStreakStore((state) => state.getStreakData);
  const prevUserRef = React.useRef<typeof user>(undefined);
  useStickyImmersiveReset();
  useThemedStatusBar();

  // Sync streak and mood to Firebase for signed-in users
  useEffect(() => {
    const currentUser = user;
    const hadUser = prevUserRef.current != null;
    prevUserRef.current = currentUser;

    if (currentUser) {
      // User signed in: load from Firestore and hydrate
      loadUserStreak(currentUser.uid)
        .then((data) => {
          if (data) {
            hydrateFromRemote(data);
          } else {
            // No doc yet: migrate local data to Firestore (first-time sync)
            const local = getStreakData();
            if (local.currentStreak > 0 || local.moodHistory.length > 0) {
              saveUserStreak(currentUser.uid, local).catch(() => {});
            }
          }
        })
        .catch(() => {});
    } else if (hadUser) {
      // User signed out: clear streak store
      clearForSignOut();
    }
  }, [user?.uid, hydrateFromRemote, clearForSignOut, getStreakData]);

  // Save streak/mood to Firestore when store changes (debounced)
  useEffect(() => {
    if (!user?.uid) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const unsubscribe = useStreakStore.subscribe(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const data = useStreakStore.getState().getStreakData();
        saveUserStreak(user.uid, data).catch(() => {});
      }, 800);
    });
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user?.uid]);

  // Initialize activity tracking and notifications
  useEffect(() => {
    // Request notification permissions
    requestNotificationPermissions();
    
    // Initialize activity tracker (tracks app state changes)
    initializeActivityTracker();
    
    // Check inactivity and schedule reminder if needed
    checkAndScheduleInactivityReminder();
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (hydrated) {
      LayoutAnimation.easeInEaseOut();
      if (shouldFollowSystemDarkMode) {
        setColorScheme("system");
      } else if (theme === "dark") {
        setColorScheme("dark");
      } else {
        setColorScheme("light");
      }
    }
  }, [theme, shouldFollowSystemDarkMode, hydrated]);

  if (!hydrated || !areFontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return <Navigator />;
};
