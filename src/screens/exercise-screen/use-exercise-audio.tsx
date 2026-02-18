import { useEffect, useRef, useMemo } from "react";
import {
  setupGuidedBreathingAudio,
  releaseGuidedBreathingAudio,
  playEndingBellSound,
  playGuidedBreathingSound,
  clearEncouragementTimeout,
  playSessionTransitionClips,
} from "@breathly/services/audio";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import { StepMetadata } from "@breathly/types/step-metadata";

export const useExerciseAudio = (guidedBreathingVoice: GuidedBreathingMode) => {
  const readyPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (guidedBreathingVoice === "disabled") {
      readyPromiseRef.current = Promise.resolve();
      return () => {};
    }
    readyPromiseRef.current = setupGuidedBreathingAudio(guidedBreathingVoice);
    return () => {
      releaseGuidedBreathingAudio();
    };
  }, [guidedBreathingVoice]);

  const whenAudioReady = useMemo(
    () => () => readyPromiseRef.current ?? Promise.resolve(),
    []
  );

  return {
    playExerciseStepAudio(stepMetadata: StepMetadata) {
      playGuidedBreathingSound(stepMetadata);
    },
    playExerciseCompletedAudio: async () => {
      clearEncouragementTimeout();
      await playEndingBellSound();
    },
    playSessionTransitionClips,
    whenAudioReady,
  };
};
