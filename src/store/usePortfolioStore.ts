import { create } from "zustand";
import type { ProjectCategoryId } from "../data/portfolio";

export type PrimarySection = "about" | "projects" | "experience" | "services" | null;
export type SiteLanguage = "cn" | "en";

type PortfolioState = {
  hasStarted: boolean;
  isHomeCopyVisible: boolean;
  language: SiteLanguage;
  activePrimary: PrimarySection;
  activeCategoryId: ProjectCategoryId;
  isTerminalOpen: boolean;
  areHotspotsVisible: boolean;
  focusPulse: number;
  startExperience: () => void;
  openPrimary: (section: PrimarySection) => void;
  dismissHomeCopy: () => void;
  showHomeCopy: () => void;
  revealHotspots: () => void;
  toggleHotspots: () => void;
  openProject: (categoryId: ProjectCategoryId) => void;
  closeTerminal: () => void;
  closeOverlay: () => void;
  toggleLanguage: () => void;
  resetExperience: () => void;
  requestSceneFocus: () => void;
};

export const usePortfolioStore = create<PortfolioState>((set) => ({
  hasStarted: false,
  isHomeCopyVisible: false,
  language: "cn",
  activePrimary: null,
  activeCategoryId: "visual",
  isTerminalOpen: false,
  areHotspotsVisible: false,
  focusPulse: 0,
  startExperience: () =>
    set({
      hasStarted: true,
      isHomeCopyVisible: true,
      activePrimary: null,
      isTerminalOpen: false,
      areHotspotsVisible: false,
    }),
  openPrimary: (section) =>
    set((state) => ({
      activePrimary: state.activePrimary === section ? null : section,
      isTerminalOpen: false,
    })),
  dismissHomeCopy: () => set({ isHomeCopyVisible: false, areHotspotsVisible: true }),
  showHomeCopy: () =>
    set({
      isHomeCopyVisible: true,
      areHotspotsVisible: false,
      activePrimary: null,
      isTerminalOpen: false,
    }),
  revealHotspots: () => set({ areHotspotsVisible: true }),
  toggleHotspots: () => set((state) => ({ areHotspotsVisible: !state.areHotspotsVisible })),
  openProject: (categoryId) =>
    set({
      activePrimary: null,
      activeCategoryId: categoryId,
      isTerminalOpen: true,
      areHotspotsVisible: false,
      isHomeCopyVisible: false,
    }),
  closeTerminal: () => set({ isTerminalOpen: false }),
  closeOverlay: () => set({ activePrimary: null, isTerminalOpen: false }),
  toggleLanguage: () => set((state) => ({ language: state.language === "cn" ? "en" : "cn" })),
  resetExperience: () =>
    set({
      hasStarted: false,
      isHomeCopyVisible: false,
      activePrimary: null,
      isTerminalOpen: false,
      areHotspotsVisible: false,
    }),
  requestSceneFocus: () => set((state) => ({ focusPulse: state.focusPulse + 1 })),
}));
