import { useEffect } from "react";
import {
  setupFrequencyTone,
  startFrequencyTone,
  stopFrequencyTone,
  releaseFrequencyTone,
  setupScheduleBackground,
  startScheduleBackground,
  stopScheduleBackground,
  releaseScheduleBackground,
  ScheduleCategory,
} from "@nowoo/services/frequency-tone";
import { FrequencyToneMode } from "@nowoo/types/frequency-tone-mode";

export const useFrequencyTone = (
  frequencyToneMode: FrequencyToneMode,
  isRunning: boolean,
  scheduleCategory: ScheduleCategory | null = null
) => {
  // When in a schedule window (category set), use schedule tone+noise; otherwise use picker selection
  const useSchedule = scheduleCategory !== null;

  useEffect(() => {
    if (useSchedule) {
      setupScheduleBackground(scheduleCategory!);
      return () => {
        releaseScheduleBackground();
      };
    }
    if (frequencyToneMode !== "disabled") {
      setupFrequencyTone(frequencyToneMode);
      return () => {
        releaseFrequencyTone();
      };
    }
  }, [frequencyToneMode, useSchedule, scheduleCategory]);

  useEffect(() => {
    if (useSchedule) {
      if (isRunning) {
        startScheduleBackground();
      } else {
        stopScheduleBackground();
      }
    } else {
      if (frequencyToneMode !== "disabled" && isRunning) {
        startFrequencyTone();
      } else {
        stopFrequencyTone();
      }
    }
  }, [frequencyToneMode, useSchedule, scheduleCategory, isRunning]);
};
