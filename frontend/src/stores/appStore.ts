import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabType = "home" | "create" | "analytics" | "profile" | "friends";
export type ThemeType = "light" | "dark" | "auto";

interface AppState {
  currentTab: TabType;
  hasSeenOnboarding: boolean;
  theme: ThemeType;
  setCurrentTab: (tab: TabType) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setTheme: (theme: ThemeType) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentTab: "home",
      hasSeenOnboarding: false,
      theme: "auto",
      setCurrentTab: (tab) => set({ currentTab: tab }),
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "app-storage",
    }
  )
);