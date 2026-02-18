import AsyncStorage from "@react-native-async-storage/async-storage";
import ms from "ms";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import { patternPresets } from "@nowoo/assets/pattern-presets";
import { FrequencyToneMode } from "@nowoo/types/frequency-tone-mode";
import { GuidedBreathingMode } from "@nowoo/types/guided-breathing-mode";
import { PatternPreset } from "@nowoo/types/pattern-preset";

interface SettingsStore {
  customPatternEnabled: boolean;
  setCustomPatternEnabled: (enabled: boolean) => unknown;
  customPatternSteps: [number, number, number, number];
  setCustomPatternStep: (stepIndex: number, stepValue: number) => unknown;
  selectedPatternPresetId: string;
  setSelectedPatternPresetId: (patternPresetId: string) => unknown;
  guidedBreathingVoice: GuidedBreathingMode;
  setGuidedBreathingVoice: (guidedBreathingVoice: GuidedBreathingMode) => unknown;
  defaultVoiceVolume: number; // 0–1, default volume for guided breathing during practice
  setDefaultVoiceVolume: (v: number) => unknown;
  defaultToneVolume: number; // 0–1, default volume for calming frequency during practice
  setDefaultToneVolume: (v: number) => unknown;
  frequencyTone: FrequencyToneMode;
  setFrequencyTone: (frequencyTone: FrequencyToneMode) => unknown;
  timeLimit: number;
  setTimeLimit: (timeLimit: number) => unknown;
  increaseTimeLimit: () => unknown;
  decreaseTimeLimit: () => unknown;
  shouldFollowSystemDarkMode: boolean;
  setShouldFollowSystemDarkMode: (shouldFollowSystemDarkMode: boolean) => unknown;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => unknown;
  vibrationEnabled: boolean;
  setVibrationEnabled: (vibrationEnabled: boolean) => unknown;
  scheduleRise: string[];
  setScheduleRise: (patternIds: string[]) => unknown;
  scheduleRiseStartTime: string; // Format: "HH:mm" (e.g., "05:00")
  setScheduleRiseStartTime: (time: string) => unknown;
  scheduleRiseEndTime: string;
  setScheduleRiseEndTime: (time: string) => unknown;
  scheduleReset: string[];
  setScheduleReset: (patternIds: string[]) => unknown;
  scheduleResetStartTime: string;
  setScheduleResetStartTime: (time: string) => unknown;
  scheduleResetEndTime: string;
  setScheduleResetEndTime: (time: string) => unknown;
  scheduleRestore: string[];
  setScheduleRestore: (patternIds: string[]) => unknown;
  scheduleRestoreStartTime: string;
  setScheduleRestoreStartTime: (time: string) => unknown;
  scheduleRestoreEndTime: string;
  setScheduleRestoreEndTime: (time: string) => unknown;
  scheduleRiseVibrationEnabled: boolean | null; // null means use main setting
  setScheduleRiseVibrationEnabled: (enabled: boolean | null) => unknown;
  scheduleResetVibrationEnabled: boolean | null;
  setScheduleResetVibrationEnabled: (enabled: boolean | null) => unknown;
  scheduleRestoreVibrationEnabled: boolean | null;
  setScheduleRestoreVibrationEnabled: (enabled: boolean | null) => unknown;
  scheduleRiseGuidedBreathingVoice: GuidedBreathingMode | null; // null means use main setting
  setScheduleRiseGuidedBreathingVoice: (voice: GuidedBreathingMode | null) => unknown;
  scheduleResetGuidedBreathingVoice: GuidedBreathingMode | null;
  setScheduleResetGuidedBreathingVoice: (voice: GuidedBreathingMode | null) => unknown;
  scheduleRestoreGuidedBreathingVoice: GuidedBreathingMode | null;
  setScheduleRestoreGuidedBreathingVoice: (voice: GuidedBreathingMode | null) => unknown;
  scheduleRiseTimeLimit: number | null; // null means use main setting, in milliseconds
  setScheduleRiseTimeLimit: (timeLimit: number | null) => unknown;
  scheduleRiseTimeLimitRandom: boolean;
  setScheduleRiseTimeLimitRandom: (random: boolean) => unknown;
  scheduleResetTimeLimit: number | null;
  setScheduleResetTimeLimit: (timeLimit: number | null) => unknown;
  scheduleResetTimeLimitRandom: boolean;
  setScheduleResetTimeLimitRandom: (random: boolean) => unknown;
  scheduleRestoreTimeLimit: number | null;
  setScheduleRestoreTimeLimit: (timeLimit: number | null) => unknown;
  scheduleRestoreTimeLimitRandom: boolean;
  setScheduleRestoreTimeLimitRandom: (random: boolean) => unknown;
  customPatterns: PatternPreset[];
  addCustomPattern: (pattern: PatternPreset) => unknown;
  removeCustomPattern: (patternId: string) => unknown;
  customPatternTitle: string;
  setCustomPatternTitle: (title: string) => unknown;
  customPatternDescription: string;
  setCustomPatternDescription: (description: string) => unknown;
}

export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        customPatternEnabled: false,
        setCustomPatternEnabled: (enabled) => set({ customPatternEnabled: enabled }),
        customPatternSteps: [ms("4 sec"), ms("2 sec"), ms("4 sec"), ms("2 sec")],
        setCustomPatternStep: (stepIndex, stepValue) => {
          const customPatternSteps = Array.from(get().customPatternSteps) as [
            number,
            number,
            number,
            number
          ];
          customPatternSteps[stepIndex] = stepValue;
          set({ customPatternSteps });
        },
        selectedPatternPresetId: "square",
        setSelectedPatternPresetId: (selectedPatternPresetId) => set({ selectedPatternPresetId }),
        guidedBreathingVoice: "female",
        setGuidedBreathingVoice: (guidedBreathingVoice) => set({ guidedBreathingVoice }),
        defaultVoiceVolume: 1,
        setDefaultVoiceVolume: (v) => set({ defaultVoiceVolume: Math.max(0, Math.min(1, v)) }),
        defaultToneVolume: 1,
        setDefaultToneVolume: (v) => set({ defaultToneVolume: Math.max(0, Math.min(1, v)) }),
        frequencyTone: "disabled",
        setFrequencyTone: (frequencyTone) => set({ frequencyTone }),
        timeLimit: ms("5 min"),
        setTimeLimit: (timeLimit) => set({ timeLimit }),
        increaseTimeLimit: () => set({ timeLimit: get().timeLimit + ms("1 min") }),
        decreaseTimeLimit: () => set({ timeLimit: get().timeLimit - ms("1 min") }),
        shouldFollowSystemDarkMode: true,
        setShouldFollowSystemDarkMode: (shouldFollowSystemDarkMode) =>
          set({ shouldFollowSystemDarkMode }),
        theme: "light",
        setTheme: (theme) => set({ theme }),
        vibrationEnabled: true,
        setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
        scheduleRise: [],
        setScheduleRise: (patternIds) => set({ scheduleRise: patternIds }),
        scheduleRiseStartTime: "",
        setScheduleRiseStartTime: (time) => set({ scheduleRiseStartTime: time }),
        scheduleRiseEndTime: "",
        setScheduleRiseEndTime: (time) => set({ scheduleRiseEndTime: time }),
        scheduleReset: [],
        setScheduleReset: (patternIds) => set({ scheduleReset: patternIds }),
        scheduleResetStartTime: "",
        setScheduleResetStartTime: (time) => set({ scheduleResetStartTime: time }),
        scheduleResetEndTime: "",
        setScheduleResetEndTime: (time) => set({ scheduleResetEndTime: time }),
        scheduleRestore: [],
        setScheduleRestore: (patternIds) => set({ scheduleRestore: patternIds }),
        scheduleRestoreStartTime: "",
        setScheduleRestoreStartTime: (time) => set({ scheduleRestoreStartTime: time }),
        scheduleRestoreEndTime: "",
        setScheduleRestoreEndTime: (time) => set({ scheduleRestoreEndTime: time }),
        scheduleRiseVibrationEnabled: null,
        setScheduleRiseVibrationEnabled: (enabled) => set({ scheduleRiseVibrationEnabled: enabled }),
        scheduleResetVibrationEnabled: null,
        setScheduleResetVibrationEnabled: (enabled) => set({ scheduleResetVibrationEnabled: enabled }),
        scheduleRestoreVibrationEnabled: null,
        setScheduleRestoreVibrationEnabled: (enabled) => set({ scheduleRestoreVibrationEnabled: enabled }),
        scheduleRiseGuidedBreathingVoice: null,
        setScheduleRiseGuidedBreathingVoice: (voice) => set({ scheduleRiseGuidedBreathingVoice: voice }),
        scheduleResetGuidedBreathingVoice: null,
        setScheduleResetGuidedBreathingVoice: (voice) => set({ scheduleResetGuidedBreathingVoice: voice }),
        scheduleRestoreGuidedBreathingVoice: null,
        setScheduleRestoreGuidedBreathingVoice: (voice) => set({ scheduleRestoreGuidedBreathingVoice: voice }),
        scheduleRiseTimeLimit: null,
        setScheduleRiseTimeLimit: (timeLimit) => set({ scheduleRiseTimeLimit: timeLimit }),
        scheduleRiseTimeLimitRandom: false,
        setScheduleRiseTimeLimitRandom: (random) => set({ scheduleRiseTimeLimitRandom: random }),
        scheduleResetTimeLimit: null,
        setScheduleResetTimeLimit: (timeLimit) => set({ scheduleResetTimeLimit: timeLimit }),
        scheduleResetTimeLimitRandom: false,
        setScheduleResetTimeLimitRandom: (random) => set({ scheduleResetTimeLimitRandom: random }),
        scheduleRestoreTimeLimit: null,
        setScheduleRestoreTimeLimit: (timeLimit) => set({ scheduleRestoreTimeLimit: timeLimit }),
        scheduleRestoreTimeLimitRandom: false,
        setScheduleRestoreTimeLimitRandom: (random) => set({ scheduleRestoreTimeLimitRandom: random }),
        customPatterns: [],
        addCustomPattern: (pattern) =>
          set((state) => ({
            customPatterns: [...state.customPatterns, pattern],
          })),
        removeCustomPattern: (patternId) =>
          set((state) => ({
            customPatterns: state.customPatterns.filter((p) => p.id !== patternId),
          })),
        customPatternTitle: "",
        setCustomPatternTitle: (title) => set({ customPatternTitle: title }),
        customPatternDescription: "",
        setCustomPatternDescription: (description) =>
          set({ customPatternDescription: description }),
      }),
      {
        name: "settings-storage",
        storage: createJSONStorage(() => AsyncStorage),
        migrate: (persistedState: any, version: number) => {
          // Migrate old voice values to new ones
          if (persistedState?.guidedBreathingVoice) {
            const oldVoice = persistedState.guidedBreathingVoice;
            if (
              oldVoice === "paul" ||
              oldVoice === "laura" ||
              oldVoice === "isabella" ||
              oldVoice === "jameson" ||
              oldVoice === "clara" ||
              oldVoice === "marcus"
            ) {
              persistedState.guidedBreathingVoice = "female";
            }
          }
          // Migrate old frequency tone options (852hz, 777hz, 432hz) to new options
          if (persistedState?.frequencyTone) {
            const old = persistedState.frequencyTone;
            if (old === "852hz" || old === "777hz" || old === "432hz") {
              persistedState.frequencyTone = "200hz";
            }
          }
          if (persistedState?.defaultVoiceVolume == null) persistedState.defaultVoiceVolume = 1;
          if (persistedState?.defaultToneVolume == null) persistedState.defaultToneVolume = 1;
          return persistedState;
        },
        version: 3,
      }
    )
  )
);

export const useSelectedPatternName = () =>
  useSettingsStore((state) => {
    if (state.customPatternEnabled) {
      return "Custom";
    }
    const allPatterns = [...patternPresets, ...state.customPatterns];
    return allPatterns.find((patternPreset) => patternPreset.id === state.selectedPatternPresetId)
      ?.name || "Custom";
  });

export const useSelectedPatternSteps = () =>
  useSettingsStore((state) => {
    if (state.customPatternEnabled) {
      return state.customPatternSteps;
    }
    const allPatterns = [...patternPresets, ...state.customPatterns];
    return allPatterns.find((patternPreset) => patternPreset.id === state.selectedPatternPresetId)
      ?.steps || state.customPatternSteps;
  });

// https://github.com/pmndrs/zustand/blob/725c2c0cc08df936f42a52e3df3dec76780a6e01/docs/integrations/persisting-store-data.md
export const useHydration = () => {
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated);

  useEffect(() => {
    const unsubFinishHydration = useSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useSettingsStore.persist.hasHydrated());
    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};
