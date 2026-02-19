import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import { User } from "firebase/auth";

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  skipAuth: boolean; // For development - skip authentication
  setSkipAuth: (skip: boolean) => void;
  isAuthenticated: () => boolean;
  resetAuth: () => void; // Reset auth state (clears user and skipAuth)
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        setUser: (user) => set({ user }),
        skipAuth: false,
        setSkipAuth: (skip) => set({ skipAuth: skip }),
        isAuthenticated: () => {
          const state = get();
          return state.skipAuth || state.user !== null;
        },
        resetAuth: () => {
          set({ user: null, skipAuth: false });
        },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => AsyncStorage),
      }
    )
  )
);

// Hook to check if auth store has hydrated (similar to useHydration in settings)
export const useAuthHydration = () => {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useAuthStore.persist.hasHydrated());
    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};
