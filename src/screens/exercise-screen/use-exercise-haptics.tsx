import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";
import { StepMetadata } from "@breathly/types/step-metadata";

export const useExerciseHaptics = (
  currentStepMetadata: StepMetadata,
  vibrationEnabled: boolean
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing intervals/timeouts when step changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Stop any ongoing vibration on Android
    if (Platform.OS === "android") {
      Vibration.cancel();
    }

    if (!vibrationEnabled || !currentStepMetadata) {
      return;
    }

    const stepId = currentStepMetadata.id;
    const duration = currentStepMetadata.duration;

    // Long continuous vibration on inhale - starts fast, slows down toward the end
    if (stepId === "inhale") {
          if (Platform.OS === "ios") {
        // Start with quick pulses, gradually slow down as inhale progresses
        const startInterval = 100; // Start with 100ms intervals (fast)
        const endInterval = 400; // End with 400ms intervals (slow)
        const startTime = Date.now();
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        const scheduleNextPulse = (elapsedTime: number) => {
          if (elapsedTime >= duration) {
            return; // Stop when duration is reached
          }
          
          // Calculate current interval: linear interpolation from start to end
          const progress = elapsedTime / duration; // 0 to 1
          const currentInterval = startInterval + (endInterval - startInterval) * progress;
          
          // Calculate next pulse time
          const nextPulseTime = elapsedTime + currentInterval;
          
          if (nextPulseTime < duration) {
            timeoutRef.current = setTimeout(() => {
              const now = Date.now();
              const newElapsedTime = now - startTime;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              scheduleNextPulse(newElapsedTime);
            }, currentInterval);
          }
        };
        
        // Start the first pulse after the initial interval
        timeoutRef.current = setTimeout(() => {
          const now = Date.now();
          const elapsedTime = now - startTime;
          scheduleNextPulse(elapsedTime);
        }, startInterval);
          } else if (Platform.OS === "android") {
        // For Android, create a pattern that starts dense and gets sparser
        // We'll use a series of vibrations with increasing gaps
        const startInterval = 100;
        const endInterval = 400;
        const startTime = Date.now();
        const pattern: number[] = [0]; // Start immediately
        
        const scheduleNextPulse = (elapsedTime: number, lastVibrateTime: number) => {
          if (elapsedTime >= duration) {
            return;
          }
          
          const progress = elapsedTime / duration;
          const currentInterval = startInterval + (endInterval - startInterval) * progress;
          const nextVibrateTime = lastVibrateTime + currentInterval;
          
          if (nextVibrateTime < duration) {
            const gap = nextVibrateTime - elapsedTime;
            pattern.push(gap, 150); // gap, then vibrate for 150ms
            timeoutRef.current = setTimeout(() => {
              const now = Date.now();
              const newElapsedTime = now - startTime;
              scheduleNextPulse(newElapsedTime, nextVibrateTime);
            }, currentInterval);
          }
        };
        
        // Start with immediate vibration
        Vibration.vibrate(150);
        scheduleNextPulse(0, 0);
      }
    }
    // Pulse pattern for hold - continues for entire hold duration
    else if (stepId === "afterInhale" || stepId === "afterExhale") {
      if (Platform.OS === "ios") {
        // Pulse every 400ms throughout the hold duration
        const pulseInterval = 400;
        const numPulses = Math.floor(duration / pulseInterval);
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let pulseCount = 1;
        intervalRef.current = setInterval(() => {
          if (pulseCount < numPulses) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            pulseCount++;
          } else {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }, pulseInterval);
      } else if (Platform.OS === "android") {
        // Repeating pulse pattern: vibrate 200ms, pause 200ms, repeat
        const pulsePattern = [0, 200, 200, 200];
        const repeatIndex = -1; // -1 means repeat the pattern
        Vibration.vibrate(pulsePattern, repeatIndex);
        // Stop after the duration
        timeoutRef.current = setTimeout(() => {
          Vibration.cancel();
        }, duration);
      }
    }
    // No vibration for exhale - already cleared above

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (Platform.OS === "android") {
        Vibration.cancel();
      }
    };
  }, [currentStepMetadata?.id, currentStepMetadata?.duration, vibrationEnabled]);
};
