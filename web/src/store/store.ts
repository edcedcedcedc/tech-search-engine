import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface CookieState {
  consent: boolean | null; // null = not answered yet
  accept: () => void;
  decline: () => void;
}

interface State {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  cookie: CookieState;
}

const COOKIE_NAME = "myAppCookieConsent";

export const useStore = create<State>((set) => ({
  mode: (typeof window !== "undefined" ? (localStorage.getItem("theme") as ThemeMode) : null) || "dark",
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
  cookie: {
    consent:
      typeof window !== "undefined"
        ? document.cookie.includes(`${COOKIE_NAME}=true`)
          ? true
          : document.cookie.includes(`${COOKIE_NAME}=false`)
          ? false
          : null
        : null,
    accept: () =>
      set((state) => {
        if (typeof document !== "undefined") {
          document.cookie = `${COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
        }
        return {
          cookie: {
            ...state.cookie,
            consent: true,
          },
        };
      }),
    decline: () =>
      set((state) => {
        if (typeof document !== "undefined") {
          document.cookie = `${COOKIE_NAME}=false; path=/; max-age=${60 * 60 * 24 * 365}`;
        }
        return {
          cookie: {
            ...state.cookie,
            consent: false,
          },
        };
      }),
  },
}));
