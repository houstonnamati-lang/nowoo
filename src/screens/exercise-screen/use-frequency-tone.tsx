import { useEffect } from "react";
import {
  setupFrequencyTone,
  startFrequencyTone,
  stopFrequencyTone,
  releaseFrequencyTone,
} from "@breathly/services/frequency-tone";
import { FrequencyToneMode } from "@breathly/types/frequency-tone-mode";

export const useFrequencyTone = (frequencyToneMode: FrequencyToneMode, isRunning: boolean) => {
  useEffect(() => {
    if (frequencyToneMode !== "disabled") {
      setupFrequencyTone(frequencyToneMode);
      return () => {
        releaseFrequencyTone();
      };
    }
  }, [frequencyToneMode]);

  useEffect(() => {
    if (frequencyToneMode !== "disabled" && isRunning) {
      startFrequencyTone();
    } else {
      stopFrequencyTone();
    }
  }, [frequencyToneMode, isRunning]);
};

