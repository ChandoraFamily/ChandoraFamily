"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeId =
  | "midnight"
  | "emerald"
  | "sapphire"
  | "amethyst"
  | "heritage";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  nameHi: string;
  label?: string;
  hindiLabel?: string;
  description?: string;
  badge: string;
  previewColor: string;
  primary: string;
  accent: string;
  accentHover: string;
  bodyBg: string;
  cardBgStart: string;
  cardBgEnd: string;
  cardBorder: string;
  cardText: string;
  edgeStroke: string;
  spouseEdge: string;
  headerBg: string;
  dockBg: string;
  navBorder: string;
  glowColor: string;
  particleColors: string[];
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  midnight: {
    id: "midnight",
    name: "Midnight Astral",
    nameHi: "मिडनाइट (तारा मंडल)",
    label: "Midnight Astral",
    hindiLabel: "मिडनाइट (तारा मंडल)",
    description: "Deep cosmic navy with starlight constellation",
    badge: "🌌",
    previewColor: "#6366f1",
    primary: "#6366f1",
    accent: "#8b5cf6",
    accentHover: "#a78bfa",
    bodyBg: "#080b20",
    cardBgStart: "#121a35",
    cardBgEnd: "#0c132a",
    cardBorder: "#202944",
    cardText: "#edf1ff",
    edgeStroke: "#d7d9e0",
    spouseEdge: "#e64ba6",
    headerBg: "rgba(6, 9, 25, 0.92)",
    dockBg: "rgba(13, 19, 42, 0.88)",
    navBorder: "rgba(255, 255, 255, 0.08)",
    glowColor: "rgba(99, 102, 241, 0.35)",
    particleColors: ["#818cf8", "#c084fc", "#60a5fa", "#fbbf24"],
  },
  emerald: {
    id: "emerald",
    name: "Emerald Dynasty",
    nameHi: "पन्ना (राजसी हरियाली)",
    label: "Emerald Dynasty",
    hindiLabel: "पन्ना (राजसी हरियाली)",
    description: "Regal forest emerald & jade lineage tones",
    badge: "🌲",
    previewColor: "#10b981",
    primary: "#10b981",
    accent: "#059669",
    accentHover: "#10b981",
    bodyBg: "#051310",
    cardBgStart: "#0a221c",
    cardBgEnd: "#051612",
    cardBorder: "#13382f",
    cardText: "#e6f9f3",
    edgeStroke: "#9fe3cd",
    spouseEdge: "#f43f5e",
    headerBg: "rgba(4, 16, 13, 0.92)",
    dockBg: "rgba(8, 28, 23, 0.88)",
    navBorder: "rgba(16, 185, 129, 0.15)",
    glowColor: "rgba(16, 185, 129, 0.35)",
    particleColors: ["#34d399", "#6ee7b7", "#a7f3d0", "#fcd34d"],
  },
  sapphire: {
    id: "sapphire",
    name: "Sapphire Ocean",
    nameHi: "नीलम (सागर नीला)",
    label: "Sapphire Ocean",
    hindiLabel: "नीलम (सागर नीला)",
    description: "Deep oceanic azure with luminous turquoise",
    badge: "🌊",
    previewColor: "#0ea5e9",
    primary: "#0ea5e9",
    accent: "#0284c7",
    accentHover: "#38bdf8",
    bodyBg: "#040d1e",
    cardBgStart: "#091c36",
    cardBgEnd: "#041124",
    cardBorder: "#123258",
    cardText: "#e0f2fe",
    edgeStroke: "#bae6fd",
    spouseEdge: "#f43f5e",
    headerBg: "rgba(3, 11, 26, 0.92)",
    dockBg: "rgba(7, 22, 46, 0.88)",
    navBorder: "rgba(14, 165, 233, 0.15)",
    glowColor: "rgba(14, 165, 233, 0.35)",
    particleColors: ["#38bdf8", "#60a5fa", "#93c5fd", "#fef08a"],
  },
  amethyst: {
    id: "amethyst",
    name: "Royal Amethyst",
    nameHi: "जामुनी (शाही अमेथिस्ट)",
    label: "Royal Amethyst",
    hindiLabel: "जामुनी (शाही अमेथिस्ट)",
    description: "Noble purple violet with iridescent sheen",
    badge: "🔮",
    previewColor: "#a855f7",
    primary: "#a855f7",
    accent: "#9333ea",
    accentHover: "#c084fc",
    bodyBg: "#0f0720",
    cardBgStart: "#1a0f33",
    cardBgEnd: "#0e061e",
    cardBorder: "#301a52",
    cardText: "#f5f3ff",
    edgeStroke: "#e9d5ff",
    spouseEdge: "#fb7185",
    headerBg: "rgba(12, 5, 27, 0.92)",
    dockBg: "rgba(22, 11, 46, 0.88)",
    navBorder: "rgba(168, 85, 247, 0.15)",
    glowColor: "rgba(168, 85, 247, 0.35)",
    particleColors: ["#c084fc", "#e879f9", "#f472b6", "#fde047"],
  },
  heritage: {
    id: "heritage",
    name: "Vintage Heritage",
    nameHi: "विरासत (गोल्डन सेपिया)",
    label: "Vintage Heritage",
    hindiLabel: "विरासत (गोल्डन सेपिया)",
    description: "Warm antique gold, sepia parchment & bronze",
    badge: "📜",
    previewColor: "#d97706",
    primary: "#d97706",
    accent: "#b45309",
    accentHover: "#f59e0b",
    bodyBg: "#120e0a",
    cardBgStart: "#201812",
    cardBgEnd: "#130d08",
    cardBorder: "#3a2a1f",
    cardText: "#fef3c7",
    edgeStroke: "#fde68a",
    spouseEdge: "#f43f5e",
    headerBg: "rgba(15, 11, 8, 0.92)",
    dockBg: "rgba(28, 20, 14, 0.88)",
    navBorder: "rgba(217, 119, 6, 0.15)",
    glowColor: "rgba(217, 119, 6, 0.35)",
    particleColors: ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7"],
  },
};

interface ThemeContextType {
  theme: ThemeId;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeId) => void;
  backgroundAnimation: boolean;
  setBackgroundAnimation: (enabled: boolean) => void;
  toggleBackgroundAnimation: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "midnight",
  themeConfig: THEMES.midnight,
  setTheme: () => {},
  backgroundAnimation: true,
  setBackgroundAnimation: () => {},
  toggleBackgroundAnimation: () => {},
});

const THEME_STORAGE_KEY = "lineage_app_theme";
const BG_ANIM_STORAGE_KEY = "lineage_app_bg_anim";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
        if (savedTheme && THEMES[savedTheme]) return savedTheme;
      } catch {
        // ignore
      }
    }
    return "midnight";
  });
  const [backgroundAnimation, setBackgroundAnimationState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedAnim = localStorage.getItem(BG_ANIM_STORAGE_KEY);
        if (savedAnim !== null) return savedAnim === "true";
      } catch {
        // ignore
      }
    }
    return true;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  };

  const setBackgroundAnimation = (enabled: boolean) => {
    setBackgroundAnimationState(enabled);
    try {
      localStorage.setItem(BG_ANIM_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
  };

  const toggleBackgroundAnimation = () => {
    setBackgroundAnimation(!backgroundAnimation);
  };

  const activeTheme = THEMES[theme] || THEMES.midnight;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", activeTheme.id);
      document.documentElement.style.setProperty("--theme-primary", activeTheme.primary);
      document.documentElement.style.setProperty("--theme-accent", activeTheme.accent);
      document.documentElement.style.setProperty("--theme-accent-hover", activeTheme.accentHover);
      document.documentElement.style.setProperty("--theme-surface", activeTheme.cardBgStart);
      document.documentElement.style.setProperty("--theme-surface-raised", activeTheme.cardBgEnd);
      document.documentElement.style.setProperty("--theme-border", activeTheme.cardBorder);
      document.documentElement.style.setProperty("--theme-text", activeTheme.cardText);
      document.documentElement.style.setProperty("--theme-body", activeTheme.bodyBg);
      document.documentElement.style.setProperty("--theme-glow", activeTheme.glowColor);
      document.body.style.backgroundColor = activeTheme.bodyBg;
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeConfig: activeTheme,
        setTheme,
        backgroundAnimation,
        setBackgroundAnimation,
        toggleBackgroundAnimation,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
