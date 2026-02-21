import { useEffect } from "react";
import {
  setupPickerBackground,
  startPickerBackground,
  stopPickerBackground,
  releasePickerBackground,
  setupScheduleBackground,
  startScheduleBackground,
  stopScheduleBackground,
  releaseScheduleBackground,
  ScheduleCategory,
} from "@nowoo/services/frequency-tone";
import { CalmingFrequencyMode, NoiseBedMode } from "@nowoo/types/frequency-tone-mode";

export const useFrequencyTone = (
  calmingFrequency: CalmingFrequencyMode,
  noiseBed: NoiseBedMode,
  isRunning: boolean,
  scheduleCategory: ScheduleCategory | null = null,
  scheduleHasOverride: boolean = false
) => {
  const useSchedule = scheduleCategory !== null;
  const useScheduleOverride = useSchedule && scheduleHasOverride;
  const hasSound = calmingFrequency !== "disabled" || noiseBed !== "disabled";

  useEffect(() => {
    if (useScheduleOverride && hasSound) {
      setupPickerBackground(calmingFrequency, noiseBed);
      return () => {
        releasePickerBackground();
      };
    }
    if (useSchedule && !scheduleHasOverride) {
      setupScheduleBackground(scheduleCategory!);
      return () => {
        releaseScheduleBackground();
      };
    }
    if (!useSchedule && hasSound) {
      setupPickerBackground(calmingFrequency, noiseBed);
      return () => {
        releasePickerBackground();
      };
    }
  }, [calmingFrequency, noiseBed, useSchedule, useScheduleOverride, scheduleHasOverride, scheduleCategory, hasSound]);

  useEffect(() => {
    if (useScheduleOverride) {
      if (hasSound && isRunning) {
        startPickerBackground();
      } else {
        stopPickerBackground();
      }
    } else if (useSchedule) {
      if (isRunning) {
        startScheduleBackground();
      } else {
        stopScheduleBackground();
      }
    } else {
      if (hasSound && isRunning) {
        startPickerBackground();
      } else {
        stopPickerBackground();
      }
    }
  }, [calmingFrequency, noiseBed, useSchedule, useScheduleOverride, scheduleHasOverride, scheduleCategory, hasSound, isRunning]);
};
