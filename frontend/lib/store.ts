import { create } from "zustand";
import type { User, DashboardStatistics, NewHireListItem, Question } from "./types";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    set({ user: null, isAuthenticated: false });
  },
}));

interface DashboardStore {
  statistics: DashboardStatistics | null;
  newHires: NewHireListItem[];
  questions: Question[];
  pendingQuestionsCount: number;
  setStatistics: (stats: DashboardStatistics) => void;
  setNewHires: (hires: NewHireListItem[]) => void;
  setQuestions: (questions: Question[]) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  statistics: null,
  newHires: [],
  questions: [],
  pendingQuestionsCount: 0,
  setStatistics: (statistics) => set({ statistics }),
  setNewHires: (newHires) => set({ newHires }),
  setQuestions: (questions) =>
    set({
      questions,
      pendingQuestionsCount: questions.filter((q) => q.status === "pending").length,
    }),
}));
