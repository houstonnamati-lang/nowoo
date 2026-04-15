import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import React, { FC, useEffect, useMemo, useState } from "react";
import { Alert, Animated, Image, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import Ionicons from "@expo/vector-icons/Ionicons";
import { images } from "@nowoo/assets/images";
import { Pressable } from "@nowoo/common/pressable";
import { RootStackParamList } from "@nowoo/core/navigator";
import { colors } from "@nowoo/design/colors";
import { useSettingsStore } from "@nowoo/stores/settings";
import { useAuthStore } from "@nowoo/stores/auth";
import { SETUP_GUIDE_STEPS, SetupGuideStepId, useSetupGuideStore } from "@nowoo/stores/setup-guide";
import { useStreakStore } from "@nowoo/stores/streak";
import { StreakModal } from "@nowoo/screens/exercise-screen/streak-modal";
import { AccountCreationSheet } from "@nowoo/screens/home-screen/account-creation-sheet";
import {
  getActiveScheduleCategory,
  getRandomPatternFromSchedule,
  getPatternById,
} from "@nowoo/utils/schedule-utils";

export const useHomeScreenStatusStore = create<{
  isHomeScreenReady: boolean;
  markHomeScreenAsReady: () => unknown;
}>((set) => ({
  isHomeScreenReady: false,
  markHomeScreenAsReady: () => set(() => ({ isHomeScreenReady: true })),
}));

export const HomeScreen: FC<NativeStackScreenProps<RootStackParamList, "Home">> = ({
  navigation,
}) => {
  const isFocused = useIsFocused();
  const { colorScheme } = useColorScheme();
  const { isHomeScreenReady, markHomeScreenAsReady } = useHomeScreenStatusStore();
  const insets = useSafeAreaInsets();
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showAccountCreationSheet, setShowAccountCreationSheet] = useState(false);
  const user = useAuthStore((state) => state.user);
  const skipAuth = useAuthStore((state) => state.skipAuth);
  const isGuest = skipAuth && !user;
  const currentStreak = useStreakStore((state) => state.currentStreak);
  const isSetupGuideActive = useSetupGuideStore((state) => state.isActive);
  const setupGuideStepIndex = useSetupGuideStore((state) => state.currentStepIndex);
  const maybeStartFirstRunGuide = useSetupGuideStore((state) => state.maybeStartFirstRunGuide);
  const nextSetupGuideStep = useSetupGuideStore((state) => state.nextStep);
  const previousSetupGuideStep = useSetupGuideStore((state) => state.previousStep);
  const skipSetupGuide = useSetupGuideStore((state) => state.skipGuide);
  
  // Get schedule data from store
  const scheduleRise = useSettingsStore((state) => state.scheduleRise);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const scheduleReset = useSettingsStore((state) => state.scheduleReset);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const scheduleRestore = useSettingsStore((state) => state.scheduleRestore);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const customPatterns = useSettingsStore((state) => state.customPatterns);
  const setSelectedPatternPresetId = useSettingsStore((state) => state.setSelectedPatternPresetId);
  const setCustomPatternEnabled = useSettingsStore((state) => state.setCustomPatternEnabled);

  // Update active category periodically (every minute) to reflect time changes
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Determine active schedule category
  // Recalculates when schedule times change or when updateTrigger changes (every minute)
  const activeCategory = useMemo(
    () =>
      getActiveScheduleCategory(
        scheduleRiseStartTime,
        scheduleRiseEndTime,
        scheduleResetStartTime,
        scheduleResetEndTime,
        scheduleRestoreStartTime,
        scheduleRestoreEndTime
      ),
    [
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime,
      updateTrigger, // Include updateTrigger so it recalculates when time changes
    ]
  );

  // Get category display name
  const categoryDisplayName = useMemo(() => {
    switch (activeCategory) {
      case "rise":
        return "Rise";
      case "reset":
        return "Reset";
      case "restore":
        return "Restore";
      default:
        return null;
    }
  }, [activeCategory]);

  // Check if any schedule has time ranges configured (patterns are optional)
  const hasAnyScheduleConfigured = useMemo(() => {
    const hasRise = scheduleRiseStartTime && scheduleRiseEndTime;
    const hasReset = scheduleResetStartTime && scheduleResetEndTime;
    const hasRestore = scheduleRestoreStartTime && scheduleRestoreEndTime;
    return hasRise || hasReset || hasRestore;
  }, [
    scheduleRiseStartTime,
    scheduleRiseEndTime,
    scheduleResetStartTime,
    scheduleResetEndTime,
    scheduleRestoreStartTime,
    scheduleRestoreEndTime,
  ]);

  // Get button text based on state
  const buttonText = useMemo(() => {
    // If there's an active category, show "Start [Category]"
    if (activeCategory === "rise") {
      return "Start Rise";
    }
    if (activeCategory === "reset") {
      return "Start Reset";
    }
    if (activeCategory === "restore") {
      return "Start Restore";
    }
    // If no active category but schedules exist, show "Start Session"
    if (hasAnyScheduleConfigured) {
      return "Start Session";
    }
    // If no schedules configured at all, show "Configure Schedule"
    return "Configure Schedule";
  }, [activeCategory, hasAnyScheduleConfigured]);

  const handleStartButtonPress = () => {
    // If no schedules are configured at all, navigate to settings
    if (!hasAnyScheduleConfigured) {
      navigation.navigate("Settings");
      return;
    }

    // If there's an active schedule category, select a random pattern from it
    if (activeCategory) {
      const randomPatternId = getRandomPatternFromSchedule(
        activeCategory,
        scheduleRise,
        scheduleReset,
        scheduleRestore,
        customPatterns
      );

      if (randomPatternId) {
        // Verify the pattern exists (either preset or custom)
        const pattern = getPatternById(randomPatternId, customPatterns);
        if (pattern) {
          // Disable custom pattern mode and select the pattern by ID
          // The useSelectedPatternSteps hook will find it in either presets or customPatterns
          setCustomPatternEnabled(false);
          setSelectedPatternPresetId(randomPatternId);
        }
      }
    }
    // If no active schedule or no patterns selected, use the default selected pattern
    navigation.navigate("Exercise");
  };

  const handleCustomizeButtonPress = () => {
    navigation.navigate("Settings");
  };

  const handleCustomSessionPress = () => {
    navigation.navigate("CustomSessionSetup");
  };

  const currentGuideStepId = SETUP_GUIDE_STEPS[
    Math.max(0, Math.min(setupGuideStepIndex, SETUP_GUIDE_STEPS.length - 1))
  ] as SetupGuideStepId;
  const [guidePulseAnim] = useState(new Animated.Value(0));

  // To avoid weird flashes we store a flag to track if the home screen has been fully rendered.
  // This flag is used to tell to `SplashScreenManager` when to hide the splash screen.
  useEffect(() => {
    if (!isHomeScreenReady) {
      markHomeScreenAsReady();
    }
  }, []);

  useEffect(() => {
    if (isHomeScreenReady) {
      maybeStartFirstRunGuide();
    }
  }, [isHomeScreenReady, maybeStartFirstRunGuide]);

  useEffect(() => {
    if (!isSetupGuideActive || !isFocused) {
      guidePulseAnim.stopAnimation();
      guidePulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(guidePulseAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      guidePulseAnim.stopAnimation();
      guidePulseAnim.setValue(0);
    };
  }, [isSetupGuideActive, isFocused, guidePulseAnim]);

  const guideTitle: Record<SetupGuideStepId, string> = {
    welcome: "Welcome to NoWoo",
    rise: "Set your Rise schedule",
    risePatterns: "Choose Rise patterns",
    riseSounds: "Set Rise sounds and haptics",
    riseAppearance: "Set Rise appearance",
    riseTimer: "Set Rise timer",
    quickBreath: "Use Quick Breath anytime",
    streak: "Check your streak and mood",
  };

  const guideMessage: Record<SetupGuideStepId, string> = {
    welcome:
      "This guide will help you configure your Rise schedule and Rise settings.",
    rise:
      "Open Settings and set a start and end time for Rise.",
    risePatterns:
      "In Rise settings, choose the breathing pattern(s) you want for the Rise schedule.",
    riseSounds:
      "In Rise settings, tune guided voice, soundscape, and vibration settings.",
    riseAppearance:
      "In Rise settings, choose animation color and optionally override the background.",
    riseTimer:
      "In Rise settings, choose the exercise timer length for this schedule.",
    quickBreath:
      "Tap Open Quick Breath, then press Start Session in that panel. That starts your first quick session and completes this guide.",
    streak:
      "Tap the flame icon to view streak details. Mood history appears here after your first completed breathwork session.",
  };

  const showSettingsHighlight =
    isSetupGuideActive &&
    (currentGuideStepId === "rise" ||
      currentGuideStepId === "risePatterns" ||
      currentGuideStepId === "riseSounds" ||
      currentGuideStepId === "riseAppearance" ||
      currentGuideStepId === "riseTimer");
  const showQuickBreathHighlight = isSetupGuideActive && currentGuideStepId === "quickBreath";
  const showStreakHighlight =
    isSetupGuideActive &&
    currentGuideStepId === "streak";
  const pulseBorderColor = guidePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(59,130,246,0.25)", "rgba(59,130,246,0.95)"],
  });
  const pulseScale = guidePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const guidePrimaryLabel: Record<SetupGuideStepId, string> = {
    welcome: "Start guide",
    rise: "Open Rise settings",
    risePatterns: "Open Rise settings",
    riseSounds: "Open Rise settings",
    riseAppearance: "Open Rise settings",
    riseTimer: "Open Rise settings",
    quickBreath: "Open Quick Breath",
    streak: "Open streak",
  };

  const handleGuidePrimaryPress = () => {
    switch (currentGuideStepId) {
      case "welcome":
        nextSetupGuideStep();
        return;
      case "rise":
      case "risePatterns":
      case "riseSounds":
      case "riseAppearance":
      case "riseTimer":
        navigation.navigate("Settings", { initialScreen: "SettingsScheduleRise" });
        return;
      case "quickBreath":
        navigation.navigate("CustomSessionSetup");
        return;
      case "streak":
        setShowStreakModal(true);
        return;
      default:
        return;
    }
  };

  const handleGuideContinue = () => {
    if (currentGuideStepId === "rise") {
      if (!scheduleRiseStartTime || !scheduleRiseEndTime) {
        Alert.alert("Rise not set", "Set both start and end times for Rise, then tap Continue.");
        return;
      }
      nextSetupGuideStep();
      return;
    }
    if (currentGuideStepId !== "quickBreath") {
      nextSetupGuideStep();
    }
  };

  const showManualContinue =
    currentGuideStepId !== "rise" &&
    currentGuideStepId !== "quickBreath";

  const { height: windowHeight } = useWindowDimensions();
  const guideAnchorsTop = currentGuideStepId === "quickBreath";
  const guideCardMaxHeight = Math.min(
    windowHeight * 0.82,
    windowHeight - insets.top - insets.bottom - 12
  );
  const guideScrollMaxHeight = Math.max(120, guideCardMaxHeight - 176);

  const guideFooterBorder = colorScheme === "dark" ? "#2f2f33" : "#e7e5e4";
  const guideMutedIcon = colorScheme === "dark" ? "#ffffff" : "#111827";

  return (
    <Animated.View
      className="flex-1 items-center"
      style={{
        // Paddings to handle safe area
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: colorScheme === "dark" ? "#3a3a3a" : "#ffffff",
      }}
    >
      <View
        className="absolute flex-row gap-3"
        style={{
          position: "absolute",
          top: insets.top + 16,
          right: insets.right + 16,
        }}
      >
        <View style={{ position: "relative", borderRadius: 12 }}>
          <Pressable
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(255, 255, 255, 0.7)",
              borderWidth: 1,
              borderColor: colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
            }}
            onPress={() => (isGuest ? setShowAccountCreationSheet(true) : setShowStreakModal(true))}
          >
            <Ionicons
              name="flame"
              size={20}
              color="#ff6b35"
            />
            {!isGuest && (
              <Text
                style={{
                  color: colorScheme === "dark" ? "#f5f5f5" : "#000000",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {currentStreak}
              </Text>
            )}
          </Pressable>
          {showStreakHighlight && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: pulseBorderColor,
                transform: [{ scale: pulseScale }],
              }}
            />
          )}
        </View>
        <View style={{ position: "relative", borderRadius: 12 }}>
          <Pressable
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(255, 255, 255, 0.7)",
              borderWidth: 1,
              borderColor: colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleCustomizeButtonPress}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={colorScheme === "dark" ? "#f5f5f5" : "#000000"}
            />
          </Pressable>
          {showSettingsHighlight && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: pulseBorderColor,
                transform: [{ scale: pulseScale }],
              }}
            />
          )}
        </View>
      </View>

      <View 
        className="mx-12 flex-1 items-center justify-center"
        style={{ marginHorizontal: 48, flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View 
          className="mb-4"
          style={{ marginBottom: 16 }}
        >
          <Image
            source={colorScheme === "dark" ? images.nowooLogoDark : images.nowooLogoLight}
            resizeMode="contain"
            style={{ width: 300, height: 300 }}
          />
        </Animated.View>
        <View
          style={{
            marginTop: 64,
            alignItems: "center",
          }}
        >
          {categoryDisplayName && (
            <View
              style={{
                width: 288,
                maxWidth: 320,
                backgroundColor: activeCategory === "rise"
                  ? "#fbbf24"
                  : activeCategory === "reset"
                  ? "#23cd32"
                  : "#a78bfa",
                height: 8,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 3,
                marginBottom: -1,
              }}
            />
          )}
          <Pressable
            className="w-72 max-w-xs items-center rounded-lg px-8 py-2 text-center"
            style={{
              width: 288,
              maxWidth: 320,
              alignItems: "center",
              borderTopLeftRadius: categoryDisplayName ? 0 : 12,
              borderTopRightRadius: categoryDisplayName ? 0 : 12,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 8,
              backgroundColor: colorScheme === "dark" 
                ? "rgba(255, 255, 255, 0.1)" 
                : "rgba(255, 255, 255, 0.7)",
              borderWidth: 1,
              borderColor: colorScheme === "dark" 
                ? "rgba(255, 255, 255, 0.2)" 
                : "rgba(0, 0, 0, 0.1)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleStartButtonPress}
          >
            <Text
              className="py-1 text-lg"
              style={{ 
                paddingVertical: 4,
                fontSize: 18,
                color: colorScheme === "dark" ? "#f5f5f5" : "#000000" 
              }}
            >
              {buttonText}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={{ position: "absolute", bottom: insets.bottom + 16, right: insets.right + 16 }}>
        <View style={{ position: "relative", borderRadius: 12 }}>
          <Pressable
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(255, 255, 255, 0.95)",
              borderWidth: 1,
              borderColor: colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(15, 23, 42, 0.12)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
            onPress={handleCustomSessionPress}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                marginRight: 6,
                backgroundColor: colorScheme === "dark" ? "#e5e7eb" : "#64748b",
              }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colorScheme === "dark" ? "#e5e7eb" : "#020617",
              }}
            >
              Quick Breath
            </Text>
          </Pressable>
          {showQuickBreathHighlight && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: pulseBorderColor,
                transform: [{ scale: pulseScale }],
              }}
            />
          )}
        </View>
      </View>
      {isSetupGuideActive && isFocused && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: guideAnchorsTop ? "flex-start" : "flex-end",
            paddingHorizontal: 16,
            paddingTop: guideAnchorsTop ? insets.top + 8 : 8,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View
            style={{
              maxHeight: guideCardMaxHeight,
              borderRadius: 16,
              backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#ffffff",
              borderWidth: 1,
              borderColor: colorScheme === "dark" ? "#2f2f33" : "#e7e5e4",
              overflow: "hidden",
            }}
          >
            <ScrollView
              style={{ maxHeight: guideScrollMaxHeight }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
                flexGrow: 0,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces={false}
            >
              <Text
                style={{
                  color: colorScheme === "dark" ? "#ffffff" : "#111827",
                  fontSize: 18,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                {guideTitle[currentGuideStepId]}
              </Text>
              <Text
                style={{
                  color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                Step {setupGuideStepIndex + 1} of {SETUP_GUIDE_STEPS.length}
              </Text>
              <Text
                style={{
                  color: colorScheme === "dark" ? "#d1d5db" : "#374151",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {guideMessage[currentGuideStepId]}
              </Text>
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 14,
                borderTopWidth: 1,
                borderTopColor: guideFooterBorder,
                gap: 10,
              }}
            >
              <Pressable onPress={skipSetupGuide} style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 4 }}>
                <Text style={{ color: colorScheme === "dark" ? "#9ca3af" : "#6b7280", fontSize: 13 }}>
                  Skip guide
                </Text>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable
                  onPress={setupGuideStepIndex > 0 ? previousSetupGuideStep : undefined}
                  accessibilityLabel="Back"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colorScheme === "dark" ? "#2f2f33" : "#f3f4f6",
                    opacity: setupGuideStepIndex > 0 ? 1 : 0.45,
                  }}
                >
                  <Ionicons name="chevron-back" size={24} color={guideMutedIcon} />
                </Pressable>
                {showManualContinue && (
                  <Pressable
                    onPress={handleGuideContinue}
                    accessibilityLabel="Continue"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colorScheme === "dark" ? "#2f2f33" : "#f3f4f6",
                    }}
                  >
                    <Ionicons name="chevron-forward" size={24} color={guideMutedIcon} />
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={handleGuidePrimaryPress}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: colorScheme === "dark" ? "#007AFF" : colors["blue-500"],
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#ffffff", fontSize: 14, fontWeight: "600", textAlign: "center" }}
                  numberOfLines={2}
                >
                  {guidePrimaryLabel[currentGuideStepId]}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <StreakModal
        visible={showStreakModal}
        onClose={() => setShowStreakModal(false)}
      />
      <AccountCreationSheet
        visible={showAccountCreationSheet}
        onClose={() => setShowAccountCreationSheet(false)}
        onSuccess={() => setShowAccountCreationSheet(false)}
      />
    </Animated.View>
  );
};
