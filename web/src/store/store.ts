import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface State {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useStore = create<State>((set) => ({
  mode: (localStorage.getItem("theme") as ThemeMode) || "dark",
  toggleMode: () =>
    set((state) => {
      const next = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return { mode: next };
    }),
  setMode: (mode) => {
    localStorage.setItem("theme", mode);
    set({ mode });
  },
}));
