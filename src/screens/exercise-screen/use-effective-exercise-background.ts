import React, { useMemo } from "react";
import { useSettingsStore } from "@nowoo/stores/settings";
import { getActiveScheduleCategory } from "@nowoo/utils/schedule-utils";
import { isDarkBackground } from "@nowoo/utils/is-dark-background";

/** When true (custom session with useDefaults), always use main exercise background, never schedule overrides. */
export const UseDefaultSettingsContext = React.createContext(false);

/**
 * Returns the effective background color and image for the exercise screen.
 * When useDefaultSettings (custom session with use defaults) is true, uses main exercise background.
 * Otherwise, when the current time falls in a Rise/Reset/Restore window and that schedule
 * has background overrides, those are used; else the main exercise background.
 * useLightText: when true, overlay text should be light (for contrast). Always true for custom upload so text is readable on any photo.
 */
export function useEffectiveExerciseBackground(): {
  backgroundColor: string;
  backgroundImage: string | null;
  useLightText: boolean;
} {
  const useDefaultSettings = React.useContext(UseDefaultSettingsContext);
  const scheduleRiseStartTime = useSettingsStore((state) => state.scheduleRiseStartTime);
  const scheduleRiseEndTime = useSettingsStore((state) => state.scheduleRiseEndTime);
  const scheduleResetStartTime = useSettingsStore((state) => state.scheduleResetStartTime);
  const scheduleResetEndTime = useSettingsStore((state) => state.scheduleResetEndTime);
  const scheduleRestoreStartTime = useSettingsStore((state) => state.scheduleRestoreStartTime);
  const scheduleRestoreEndTime = useSettingsStore((state) => state.scheduleRestoreEndTime);
  const scheduleRiseBackgroundColor = useSettingsStore((state) => state.scheduleRiseBackgroundColor);
  const scheduleRiseBackgroundImage = useSettingsStore((state) => state.scheduleRiseBackgroundImage);
  const scheduleResetBackgroundColor = useSettingsStore((state) => state.scheduleResetBackgroundColor);
  const scheduleResetBackgroundImage = useSettingsStore((state) => state.scheduleResetBackgroundImage);
  const scheduleRestoreBackgroundColor = useSettingsStore((state) => state.scheduleRestoreBackgroundColor);
  const scheduleRestoreBackgroundImage = useSettingsStore((state) => state.scheduleRestoreBackgroundImage);
  const exerciseBackgroundColor = useSettingsStore((state) => state.exerciseBackgroundColor);
  const exerciseBackgroundImage = useSettingsStore((state) => state.exerciseBackgroundImage);

  return useMemo(() => {
    const base = (bgColor: string, bgImage: string | null) => ({
      backgroundColor: bgColor,
      backgroundImage: bgImage,
      useLightText: bgImage === "custom" ? true : isDarkBackground(bgColor),
    });
    if (useDefaultSettings) {
      return base(exerciseBackgroundColor, exerciseBackgroundImage);
    }
    const activeCategory = getActiveScheduleCategory(
      scheduleRiseStartTime,
      scheduleRiseEndTime,
      scheduleResetStartTime,
      scheduleResetEndTime,
      scheduleRestoreStartTime,
      scheduleRestoreEndTime
    );
    if (activeCategory === "rise" && scheduleRiseBackgroundColor != null) {
      return base(scheduleRiseBackgroundColor, scheduleRiseBackgroundImage);
    }
    if (activeCategory === "reset" && scheduleResetBackgroundColor != null) {
      return base(scheduleResetBackgroundColor, scheduleResetBackgroundImage);
    }
    if (activeCategory === "restore" && scheduleRestoreBackgroundColor != null) {
      return base(scheduleRestoreBackgroundColor, scheduleRestoreBackgroundImage);
    }
    return base(exerciseBackgroundColor, exerciseBackgroundImage);
  }, [
    useDefaultSettings,
    exerciseBackgroundColor,
    exerciseBackgroundImage,
    scheduleRiseStartTime,
    scheduleRiseEndTime,
    scheduleResetStartTime,
    scheduleResetEndTime,
    scheduleRestoreStartTime,
    scheduleRestoreEndTime,
    scheduleRiseBackgroundColor,
    scheduleRiseBackgroundImage,
    scheduleResetBackgroundColor,
    scheduleResetBackgroundImage,
    scheduleRestoreBackgroundColor,
    scheduleRestoreBackgroundImage,
    exerciseBackgroundColor,
    exerciseBackgroundImage,
  ]);
}
