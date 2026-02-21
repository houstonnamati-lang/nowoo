import AsyncStorage from "@react-native-async-storage/async-storage";
import ms from "ms";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import { patternPresets } from "@nowoo/assets/pattern-presets";
import { colors } from "@nowoo/design/colors";
import { DEFAULT_SCHEDULE_PATTERNS } from "@nowoo/utils/pattern-schedule-dots";
import { CalmingFrequencyMode, NoiseBedMode } from "@nowoo/types/frequency-tone-mode";
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
  calmingFrequency: CalmingFrequencyMode;
  setCalmingFrequency: (mode: CalmingFrequencyMode) => unknown;
  noiseBed: NoiseBedMode;
  setNoiseBed: (mode: NoiseBedMode) => unknown;
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
  vibrationStrength: number; // 0–1, strength of vibration feedback
  setVibrationStrength: (v: number) => unknown;
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
  scheduleRiseVibrationStrength: number | null; // null means use main vibrationStrength
  setScheduleRiseVibrationStrength: (v: number | null) => unknown;
  scheduleResetVibrationEnabled: boolean | null;
  setScheduleResetVibrationEnabled: (enabled: boolean | null) => unknown;
  scheduleResetVibrationStrength: number | null;
  setScheduleResetVibrationStrength: (v: number | null) => unknown;
  scheduleRestoreVibrationEnabled: boolean | null;
  setScheduleRestoreVibrationEnabled: (enabled: boolean | null) => unknown;
  scheduleRestoreVibrationStrength: number | null;
  setScheduleRestoreVibrationStrength: (v: number | null) => unknown;
  scheduleRiseGuidedBreathingVoice: GuidedBreathingMode | null; // null means use main setting
  setScheduleRiseGuidedBreathingVoice: (voice: GuidedBreathingMode | null) => unknown;
  scheduleResetGuidedBreathingVoice: GuidedBreathingMode | null;
  setScheduleResetGuidedBreathingVoice: (voice: GuidedBreathingMode | null) => unknown;
  scheduleRestoreGuidedBreathingVoice: GuidedBreathingMode | null;
  setScheduleRestoreGuidedBreathingVoice: (voice: GuidedBreathingMode | null) => unknown;
  scheduleRiseCalmingFrequency: CalmingFrequencyMode | null; // null means use main setting
  setScheduleRiseCalmingFrequency: (mode: CalmingFrequencyMode | null) => unknown;
  scheduleRiseNoiseBed: NoiseBedMode | null;
  setScheduleRiseNoiseBed: (mode: NoiseBedMode | null) => unknown;
  scheduleResetCalmingFrequency: CalmingFrequencyMode | null;
  setScheduleResetCalmingFrequency: (mode: CalmingFrequencyMode | null) => unknown;
  scheduleResetNoiseBed: NoiseBedMode | null;
  setScheduleResetNoiseBed: (mode: NoiseBedMode | null) => unknown;
  scheduleRestoreCalmingFrequency: CalmingFrequencyMode | null;
  setScheduleRestoreCalmingFrequency: (mode: CalmingFrequencyMode | null) => unknown;
  scheduleRestoreNoiseBed: NoiseBedMode | null;
  setScheduleRestoreNoiseBed: (mode: NoiseBedMode | null) => unknown;
  scheduleRiseVoiceVolume: number | null; // null means use main defaultVoiceVolume
  setScheduleRiseVoiceVolume: (v: number | null) => unknown;
  scheduleResetVoiceVolume: number | null;
  setScheduleResetVoiceVolume: (v: number | null) => unknown;
  scheduleRestoreVoiceVolume: number | null;
  setScheduleRestoreVoiceVolume: (v: number | null) => unknown;
  scheduleRiseToneVolume: number | null; // null means use main defaultToneVolume
  setScheduleRiseToneVolume: (v: number | null) => unknown;
  scheduleResetToneVolume: number | null;
  setScheduleResetToneVolume: (v: number | null) => unknown;
  scheduleRestoreToneVolume: number | null;
  setScheduleRestoreToneVolume: (v: number | null) => unknown;
  scheduleRiseTimeLimit: number; // milliseconds, default 3 min until changed
  setScheduleRiseTimeLimit: (timeLimit: number) => unknown;
  scheduleResetTimeLimit: number;
  setScheduleResetTimeLimit: (timeLimit: number) => unknown;
  scheduleRestoreTimeLimit: number;
  setScheduleRestoreTimeLimit: (timeLimit: number) => unknown;
  scheduleRiseColor: string | null; // null means use default color
  setScheduleRiseColor: (color: string | null) => unknown;
  scheduleResetColor: string | null;
  setScheduleResetColor: (color: string | null) => unknown;
  scheduleRestoreColor: string | null;
  setScheduleRestoreColor: (color: string | null) => unknown;
  scheduleRiseBackgroundColor: string | null; // null = use main exercise background
  setScheduleRiseBackgroundColor: (color: string | null) => unknown;
  scheduleRiseBackgroundImage: string | null;
  setScheduleRiseBackgroundImage: (image: string | null) => unknown;
  scheduleResetBackgroundColor: string | null;
  setScheduleResetBackgroundColor: (color: string | null) => unknown;
  scheduleResetBackgroundImage: string | null;
  setScheduleResetBackgroundImage: (image: string | null) => unknown;
  scheduleRestoreBackgroundColor: string | null;
  setScheduleRestoreBackgroundColor: (color: string | null) => unknown;
  scheduleRestoreBackgroundImage: string | null;
  setScheduleRestoreBackgroundImage: (image: string | null) => unknown;
  exerciseBackgroundColor: string; // Hex color for exercise screen background
  setExerciseBackgroundColor: (color: string) => unknown;
  exerciseBackgroundImage: string | null; // Image key from images.screenBgs, null for no image
  setExerciseBackgroundImage: (image: string | null) => unknown;
  exerciseAnimationColor: string; // Hex color for breathing animation circle (default)
  setExerciseAnimationColor: (color: string) => unknown;
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
        calmingFrequency: "disabled",
        setCalmingFrequency: (calmingFrequency) => set({ calmingFrequency }),
        noiseBed: "disabled",
        setNoiseBed: (noiseBed) => set({ noiseBed }),
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
        vibrationStrength: 1,
        setVibrationStrength: (v) => set({ vibrationStrength: Math.max(0, Math.min(1, v)) }),
        scheduleRise: [...DEFAULT_SCHEDULE_PATTERNS.rise],
        setScheduleRise: (patternIds) => set({ scheduleRise: patternIds }),
        scheduleRiseStartTime: "",
        setScheduleRiseStartTime: (time) => set({ scheduleRiseStartTime: time }),
        scheduleRiseEndTime: "",
        setScheduleRiseEndTime: (time) => set({ scheduleRiseEndTime: time }),
        scheduleReset: [...DEFAULT_SCHEDULE_PATTERNS.reset],
        setScheduleReset: (patternIds) => set({ scheduleReset: patternIds }),
        scheduleResetStartTime: "",
        setScheduleResetStartTime: (time) => set({ scheduleResetStartTime: time }),
        scheduleResetEndTime: "",
        setScheduleResetEndTime: (time) => set({ scheduleResetEndTime: time }),
        scheduleRestore: [...DEFAULT_SCHEDULE_PATTERNS.restore],
        setScheduleRestore: (patternIds) => set({ scheduleRestore: patternIds }),
        scheduleRestoreStartTime: "",
        setScheduleRestoreStartTime: (time) => set({ scheduleRestoreStartTime: time }),
        scheduleRestoreEndTime: "",
        setScheduleRestoreEndTime: (time) => set({ scheduleRestoreEndTime: time }),
        scheduleRiseVibrationEnabled: null,
        setScheduleRiseVibrationEnabled: (enabled) => set({ scheduleRiseVibrationEnabled: enabled }),
        scheduleRiseVibrationStrength: null,
        setScheduleRiseVibrationStrength: (v) => set({ scheduleRiseVibrationStrength: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleResetVibrationEnabled: null,
        setScheduleResetVibrationEnabled: (enabled) => set({ scheduleResetVibrationEnabled: enabled }),
        scheduleResetVibrationStrength: null,
        setScheduleResetVibrationStrength: (v) => set({ scheduleResetVibrationStrength: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleRestoreVibrationEnabled: null,
        setScheduleRestoreVibrationEnabled: (enabled) => set({ scheduleRestoreVibrationEnabled: enabled }),
        scheduleRestoreVibrationStrength: null,
        setScheduleRestoreVibrationStrength: (v) => set({ scheduleRestoreVibrationStrength: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleRiseGuidedBreathingVoice: null,
        setScheduleRiseGuidedBreathingVoice: (voice) => set({ scheduleRiseGuidedBreathingVoice: voice }),
        scheduleResetGuidedBreathingVoice: null,
        setScheduleResetGuidedBreathingVoice: (voice) => set({ scheduleResetGuidedBreathingVoice: voice }),
        scheduleRestoreGuidedBreathingVoice: null,
        setScheduleRestoreGuidedBreathingVoice: (voice) => set({ scheduleRestoreGuidedBreathingVoice: voice }),
        scheduleRiseCalmingFrequency: null,
        setScheduleRiseCalmingFrequency: (mode) => set({ scheduleRiseCalmingFrequency: mode }),
        scheduleRiseNoiseBed: null,
        setScheduleRiseNoiseBed: (mode) => set({ scheduleRiseNoiseBed: mode }),
        scheduleResetCalmingFrequency: null,
        setScheduleResetCalmingFrequency: (mode) => set({ scheduleResetCalmingFrequency: mode }),
        scheduleResetNoiseBed: null,
        setScheduleResetNoiseBed: (mode) => set({ scheduleResetNoiseBed: mode }),
        scheduleRestoreCalmingFrequency: null,
        setScheduleRestoreCalmingFrequency: (mode) => set({ scheduleRestoreCalmingFrequency: mode }),
        scheduleRestoreNoiseBed: null,
        setScheduleRestoreNoiseBed: (mode) => set({ scheduleRestoreNoiseBed: mode }),
        scheduleRiseVoiceVolume: null,
        setScheduleRiseVoiceVolume: (v) => set({ scheduleRiseVoiceVolume: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleResetVoiceVolume: null,
        setScheduleResetVoiceVolume: (v) => set({ scheduleResetVoiceVolume: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleRestoreVoiceVolume: null,
        setScheduleRestoreVoiceVolume: (v) => set({ scheduleRestoreVoiceVolume: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleRiseToneVolume: null,
        setScheduleRiseToneVolume: (v) => set({ scheduleRiseToneVolume: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleResetToneVolume: null,
        setScheduleResetToneVolume: (v) => set({ scheduleResetToneVolume: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleRestoreToneVolume: null,
        setScheduleRestoreToneVolume: (v) => set({ scheduleRestoreToneVolume: v == null ? v : Math.max(0, Math.min(1, v)) }),
        scheduleRiseTimeLimit: ms("3 min"),
        setScheduleRiseTimeLimit: (timeLimit) => set({ scheduleRiseTimeLimit: timeLimit }),
        scheduleResetTimeLimit: ms("3 min"),
        setScheduleResetTimeLimit: (timeLimit) => set({ scheduleResetTimeLimit: timeLimit }),
        scheduleRestoreTimeLimit: ms("3 min"),
        setScheduleRestoreTimeLimit: (timeLimit) => set({ scheduleRestoreTimeLimit: timeLimit }),
        scheduleRiseColor: null,
        setScheduleRiseColor: (color) => set({ scheduleRiseColor: color }),
        scheduleResetColor: null,
        setScheduleResetColor: (color) => set({ scheduleResetColor: color }),
        scheduleRestoreColor: null,
        setScheduleRestoreColor: (color) => set({ scheduleRestoreColor: color }),
        scheduleRiseBackgroundColor: null,
        setScheduleRiseBackgroundColor: (color) => set({ scheduleRiseBackgroundColor: color }),
        scheduleRiseBackgroundImage: null,
        setScheduleRiseBackgroundImage: (image) => set({ scheduleRiseBackgroundImage: image }),
        scheduleResetBackgroundColor: null,
        setScheduleResetBackgroundColor: (color) => set({ scheduleResetBackgroundColor: color }),
        scheduleResetBackgroundImage: null,
        setScheduleResetBackgroundImage: (image) => set({ scheduleResetBackgroundImage: image }),
        scheduleRestoreBackgroundColor: null,
        setScheduleRestoreBackgroundColor: (color) => set({ scheduleRestoreBackgroundColor: color }),
        scheduleRestoreBackgroundImage: null,
        setScheduleRestoreBackgroundImage: (image) => set({ scheduleRestoreBackgroundImage: image }),
        exerciseBackgroundColor: "#1a1a1a", // Default dark background
        setExerciseBackgroundColor: (color) => set({ exerciseBackgroundColor: color }),
        exerciseBackgroundImage: null,
        setExerciseBackgroundImage: (image) => set({ exerciseBackgroundImage: image }),
        exerciseAnimationColor: colors.pastel.orange,
        setExerciseAnimationColor: (color) => set({ exerciseAnimationColor: color }),
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
          // Migrate frequencyTone to calmingFrequency + noiseBed (v8)
          if (persistedState?.frequencyTone !== undefined) {
            const old = persistedState.frequencyTone;
            if (old === "200hz" || old === "136hz" || old === "100hz") {
              persistedState.calmingFrequency = old;
              persistedState.noiseBed = "disabled";
            } else if (old === "brown" || old === "green" || old === "pink") {
              persistedState.calmingFrequency = "disabled";
              persistedState.noiseBed = old;
            } else {
              persistedState.calmingFrequency = "disabled";
              persistedState.noiseBed = "disabled";
            }
            delete persistedState.frequencyTone;
          }
          if (persistedState?.defaultVoiceVolume == null) persistedState.defaultVoiceVolume = 1;
          if (persistedState?.defaultToneVolume == null) persistedState.defaultToneVolume = 1;
          if (persistedState?.vibrationStrength == null) persistedState.vibrationStrength = 1;
          // Set default schedule patterns when never configured (undefined); don't overwrite [] (user cleared)
          if (persistedState?.scheduleRise === undefined)
            persistedState.scheduleRise = [...DEFAULT_SCHEDULE_PATTERNS.rise];
          if (persistedState?.scheduleReset === undefined)
            persistedState.scheduleReset = [...DEFAULT_SCHEDULE_PATTERNS.reset];
          if (persistedState?.scheduleRestore === undefined)
            persistedState.scheduleRestore = [...DEFAULT_SCHEDULE_PATTERNS.restore];
          // Set default schedule time limits (3 min) when never configured; remove deprecated random flags
          const defaultScheduleTime = ms("3 min");
          if (persistedState?.scheduleRiseTimeLimit == null)
            persistedState.scheduleRiseTimeLimit = defaultScheduleTime;
          if (persistedState?.scheduleResetTimeLimit == null)
            persistedState.scheduleResetTimeLimit = defaultScheduleTime;
          if (persistedState?.scheduleRestoreTimeLimit == null)
            persistedState.scheduleRestoreTimeLimit = defaultScheduleTime;
          delete persistedState?.scheduleRiseTimeLimitRandom;
          delete persistedState?.scheduleResetTimeLimitRandom;
          delete persistedState?.scheduleRestoreTimeLimitRandom;
          if (persistedState?.exerciseAnimationColor == null)
            persistedState.exerciseAnimationColor = colors.pastel.orange;
          // v7/v8: schedule frequency overrides - migrate from scheduleRiseFrequencyTone to calmingFrequency + noiseBed
          const migrateScheduleFreq = (old: string | null) => {
            if (old === null) return { cf: null as string | null, nb: null as string | null };
            if (["200hz", "136hz", "100hz"].includes(old)) return { cf: old, nb: null };
            if (["brown", "green", "pink"].includes(old)) return { cf: null, nb: old };
            return { cf: "disabled" as const, nb: "disabled" as const }; // old "disabled" override
          };
          if (persistedState?.scheduleRiseFrequencyTone !== undefined) {
            const { cf, nb } = migrateScheduleFreq(persistedState.scheduleRiseFrequencyTone);
            persistedState.scheduleRiseCalmingFrequency = cf;
            persistedState.scheduleRiseNoiseBed = nb;
            delete persistedState.scheduleRiseFrequencyTone;
          }
          if (persistedState?.scheduleRiseCalmingFrequency === undefined)
            persistedState.scheduleRiseCalmingFrequency = null;
          if (persistedState?.scheduleRiseNoiseBed === undefined)
            persistedState.scheduleRiseNoiseBed = null;
          if (persistedState?.scheduleResetFrequencyTone !== undefined) {
            const { cf, nb } = migrateScheduleFreq(persistedState.scheduleResetFrequencyTone);
            persistedState.scheduleResetCalmingFrequency = cf;
            persistedState.scheduleResetNoiseBed = nb;
            delete persistedState.scheduleResetFrequencyTone;
          }
          if (persistedState?.scheduleResetCalmingFrequency === undefined)
            persistedState.scheduleResetCalmingFrequency = null;
          if (persistedState?.scheduleResetNoiseBed === undefined)
            persistedState.scheduleResetNoiseBed = null;
          if (persistedState?.scheduleRestoreFrequencyTone !== undefined) {
            const { cf, nb } = migrateScheduleFreq(persistedState.scheduleRestoreFrequencyTone);
            persistedState.scheduleRestoreCalmingFrequency = cf;
            persistedState.scheduleRestoreNoiseBed = nb;
            delete persistedState.scheduleRestoreFrequencyTone;
          }
          if (persistedState?.scheduleRestoreCalmingFrequency === undefined)
            persistedState.scheduleRestoreCalmingFrequency = null;
          if (persistedState?.scheduleRestoreNoiseBed === undefined)
            persistedState.scheduleRestoreNoiseBed = null;
          if (persistedState?.scheduleRiseVoiceVolume === undefined)
            persistedState.scheduleRiseVoiceVolume = null;
          if (persistedState?.scheduleResetVoiceVolume === undefined)
            persistedState.scheduleResetVoiceVolume = null;
          if (persistedState?.scheduleRestoreVoiceVolume === undefined)
            persistedState.scheduleRestoreVoiceVolume = null;
          if (persistedState?.scheduleRiseToneVolume === undefined)
            persistedState.scheduleRiseToneVolume = null;
          if (persistedState?.scheduleResetToneVolume === undefined)
            persistedState.scheduleResetToneVolume = null;
          if (persistedState?.scheduleRestoreToneVolume === undefined)
            persistedState.scheduleRestoreToneVolume = null;
          if (persistedState?.scheduleRiseVibrationStrength === undefined)
            persistedState.scheduleRiseVibrationStrength = null;
          if (persistedState?.scheduleResetVibrationStrength === undefined)
            persistedState.scheduleResetVibrationStrength = null;
          if (persistedState?.scheduleRestoreVibrationStrength === undefined)
            persistedState.scheduleRestoreVibrationStrength = null;
          return persistedState;
        },
        version: 8,
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
