import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const SETUP_GUIDE_STEPS = [
  "welcome",
  "rise",
  "risePatterns",
  "riseSounds",
  "riseAppearance",
  "riseTimer",
  "streak",
  "quickBreath",
] as const;

export type SetupGuideStepId = (typeof SETUP_GUIDE_STEPS)[number];

type SetupGuideStore = {
  hasSeenGuide: boolean;
  hasCompletedGuide: boolean;
  isActive: boolean;
  startedFromSettings: boolean;
  currentStepIndex: number;
  maybeStartFirstRunGuide: () => void;
  startGuideFromSettings: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipGuide: () => void;
  finishGuide: () => void;
};

export const useSetupGuideStore = create<SetupGuideStore>()(
  persist(
    (set, get) => ({
      hasSeenGuide: false,
      hasCompletedGuide: false,
      isActive: false,
      startedFromSettings: false,
      currentStepIndex: 0,
      maybeStartFirstRunGuide: () => {
        const { hasSeenGuide, isActive } = get();
        if (hasSeenGuide || isActive) return;
        set({
          hasSeenGuide: true,
          isActive: true,
          startedFromSettings: false,
          currentStepIndex: 0,
        });
      },
      startGuideFromSettings: () => {
        set({
          isActive: true,
          startedFromSettings: true,
          currentStepIndex: 0,
        });
      },
      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex >= SETUP_GUIDE_STEPS.length - 1) {
          set({
            hasSeenGuide: true,
            hasCompletedGuide: true,
            isActive: false,
            startedFromSettings: false,
            currentStepIndex: 0,
          });
          return;
        }
        set({ currentStepIndex: currentStepIndex + 1 });
      },
      previousStep: () => {
        const { currentStepIndex } = get();
        set({ currentStepIndex: Math.max(0, currentStepIndex - 1) });
      },
      skipGuide: () => {
        set({
          hasSeenGuide: true,
          isActive: false,
          startedFromSettings: false,
          currentStepIndex: 0,
        });
      },
      finishGuide: () => {
        set({
          hasSeenGuide: true,
          hasCompletedGuide: true,
          isActive: false,
          startedFromSettings: false,
          currentStepIndex: 0,
        });
      },
    }),
    {
      name: "setup-guide-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
