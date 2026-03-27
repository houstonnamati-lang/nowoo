import { useEffect, useRef, useMemo } from "react";
import {
  setupGuidedBreathingAudio,
  releaseGuidedBreathingAudio,
  playEndingBellSound,
  playGuidedBreathingSound,
  clearEncouragementTimeout,
  playSessionTransitionClips,
} from "@nowoo/services/audio";
import { GuidedBreathingMode } from "@nowoo/types/guided-breathing-mode";
import { StepMetadata } from "@nowoo/types/step-metadata";

export const useExerciseAudio = (guidedBreathingVoice: GuidedBreathingMode) => {
  const readyPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (guidedBreathingVoice === "disabled") {
      readyPromiseRef.current = Promise.resolve();
      return () => {};
    }
    // Never block exercise start on audio preload failures.
    readyPromiseRef.current = setupGuidedBreathingAudio(guidedBreathingVoice).catch((error) => {
      console.warn("[exercise-audio] Guided breathing preload failed:", error);
    });
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
