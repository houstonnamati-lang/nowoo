import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import React, { FC, useEffect, useMemo } from "react";
import { Animated, Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import Ionicons from "@expo/vector-icons/Ionicons";
import { images } from "@breathly/assets/images";
import { Pressable } from "@breathly/common/pressable";
import { RootStackParamList } from "@breathly/core/navigator";
import { colors } from "@breathly/design/colors";
import { useSettingsStore } from "@breathly/stores/settings";
import {
  getActiveScheduleCategory,
  getRandomPatternFromSchedule,
  getPatternById,
} from "@breathly/utils/schedule-utils";

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
  const { colorScheme } = useColorScheme();
  const { isHomeScreenReady, markHomeScreenAsReady } = useHomeScreenStatusStore();
  const insets = useSafeAreaInsets();
  
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

  const handleStartButtonPress = () => {
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

  // To avoid weird flashes we store a flag to track if the home screen has been fully rendered.
  // This flag is used to tell to `SplashScreenManager` when to hide the splash screen.
  useEffect(() => {
    if (!isHomeScreenReady) {
      markHomeScreenAsReady();
    }
  }, []);

  return (
    <Animated.View
      className="flex-1 items-center"
      style={{
        // Paddings to handle safe area
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: colorScheme === "dark" ? "#000000" : "#ffffff",
      }}
    >
      <View 
        className="absolute inset-0"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Image
          source={images.backgroundStainless}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </View>

      <Pressable
        className="absolute"
        style={{
          position: "absolute",
          top: insets.top + 16,
          right: insets.right + 16,
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
            style={{ width: 225, height: 225 }}
          />
        </Animated.View>
        {categoryDisplayName && (
          <Animated.Text
            className="mb-2 text-center"
            style={{
              marginBottom: 8,
              fontSize: 18,
              fontWeight: "500",
              color: colorScheme === "dark" ? "#f5f5f5" : "#000000",
            }}
          >
            {categoryDisplayName}
          </Animated.Text>
        )}
        <Pressable
          className="mt-16 w-72 max-w-xs items-center rounded-lg px-8 py-2 text-center"
          style={{
            marginTop: categoryDisplayName ? 16 : 64,
            width: 288,
            maxWidth: 320,
            alignItems: "center",
            borderRadius: 12,
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
            Start Session
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};
