import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Mood = "sad" | "neutral" | "happy";

interface MoodEntry {
  mood: Mood;
  timestamp: number;
}

interface StreakStore {
  currentStreak: number; // Days in a row
  lastActivityDate: string | null; // YYYY-MM-DD format
  moodHistory: MoodEntry[];
  incrementStreak: () => void;
  recordMood: (mood: Mood) => void;
  getMoodPercentages: () => Record<Mood, number>;
}

export const useStreakStore = create<StreakStore>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      lastActivityDate: null,
      moodHistory: [],
      incrementStreak: () => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const { lastActivityDate, currentStreak } = get();
        
        if (lastActivityDate === today) {
          // Already recorded today, don't increment
          return;
        }
        
        if (lastActivityDate === null) {
          // First time - start streak at 1
          set({ currentStreak: 1, lastActivityDate: today });
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          
          if (lastActivityDate === yesterdayStr) {
            // Consecutive day - increment streak
            set({ currentStreak: currentStreak + 1, lastActivityDate: today });
          } else {
            // Streak broken - reset to 1
            set({ currentStreak: 1, lastActivityDate: today });
          }
        }
      },
      recordMood: (mood: Mood) => {
        const moodEntry: MoodEntry = {
          mood,
          timestamp: Date.now(),
        };
        set((state) => ({
          moodHistory: [...state.moodHistory, moodEntry],
        }));
      },
      getMoodPercentages: () => {
        const { moodHistory } = get();
        if (moodHistory.length === 0) {
          return {
            sad: 0,
            neutral: 0,
            happy: 0,
          };
        }
        
        const counts: Record<Mood, number> = {
          sad: 0,
          neutral: 0,
          happy: 0,
        };
        
        moodHistory.forEach((entry) => {
          counts[entry.mood]++;
        });
        
        const total = moodHistory.length;
        return {
          sad: Math.round((counts.sad / total) * 100),
          neutral: Math.round((counts.neutral / total) * 100),
          happy: Math.round((counts.happy / total) * 100),
        };
      },
    }),
    {
      name: "streak-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
