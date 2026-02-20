import React, { useMemo } from "react";
import { useSettingsStore } from "@nowoo/stores/settings";
import { getActiveScheduleCategory } from "@nowoo/utils/schedule-utils";

/** When true (custom session with useDefaults), always use main exercise background, never schedule overrides. */
export const UseDefaultSettingsContext = React.createContext(false);

/**
 * Returns the effective background color and image for the exercise screen.
 * When useDefaultSettings (custom session with use defaults) is true, uses main exercise background.
 * Otherwise, when the current time falls in a Rise/Reset/Restore window and that schedule
 * has background overrides, those are used; else the main exercise background.
 */
export function useEffectiveExerciseBackground(): {
  backgroundColor: string;
  backgroundImage: string | null;
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
    if (useDefaultSettings) {
      return {
        backgroundColor: exerciseBackgroundColor,
        backgroundImage: exerciseBackgroundImage,
      };
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
      return {
        backgroundColor: scheduleRiseBackgroundColor,
        backgroundImage: scheduleRiseBackgroundImage,
      };
    }
    if (activeCategory === "reset" && scheduleResetBackgroundColor != null) {
      return {
        backgroundColor: scheduleResetBackgroundColor,
        backgroundImage: scheduleResetBackgroundImage,
      };
    }
    if (activeCategory === "restore" && scheduleRestoreBackgroundColor != null) {
      return {
        backgroundColor: scheduleRestoreBackgroundColor,
        backgroundImage: scheduleRestoreBackgroundImage,
      };
    }
    return {
      backgroundColor: exerciseBackgroundColor,
      backgroundImage: exerciseBackgroundImage,
    };
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
