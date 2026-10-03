"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider } from "@emotion/react";
import { IconContext } from "@phosphor-icons/react";
import { EmotionRegistry } from "@/lib/emotion/registry";
import { GlobalStyles } from "@/styles/global";
import { buildTheme } from "@/styles/theme";
import {
  AccessibilityProvider,
  rememberScheme,
  useAccessibility,
  type AccessibilitySettings,
} from "./accessibility";

const iconDefaults = {
  size: 20,
  weight: "regular",
  color: "currentColor",
} as const;

/** O sistema operacional está no modo escuro? (acompanha a mudança ao vivo) */
function usePrefersDark(initial: boolean) {
  const [dark, setDark] = useState(initial);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      setDark(query.matches);
      rememberScheme(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return dark;
}

/** Tema conforme a acessibilidade: aparência (claro/escuro/sistema) e contraste. */
function ThemedApp({ children, prefersDark: initialPrefersDark }: { children: ReactNode; prefersDark: boolean }) {
  const { settings } = useAccessibility();
  const prefersDark = usePrefersDark(initialPrefersDark);
  const dark = settings.appearance === "dark" || (settings.appearance === "system" && prefersDark);
  const active = useMemo(
    () => buildTheme({ dark, highContrast: settings.highContrast }),
    [dark, settings.highContrast],
  );

  // Trocou a aparência: a barra do navegador acompanha o fundo (branco no claro)
  const surface = active.palette.neutral[0];
  useEffect(() => {
    const tags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (tags.length === 0) {
      const tag = document.createElement("meta");
      tag.name = "theme-color";
      tag.content = surface;
      document.head.appendChild(tag);
    }
    tags.forEach((tag) => {
      tag.content = surface;
      tag.removeAttribute("media");
    });
  }, [surface]);

  return (
    <ThemeProvider theme={active}>
      <IconContext.Provider value={iconDefaults}>
        <GlobalStyles />
        {children}
      </IconContext.Provider>
    </ThemeProvider>
  );
}

type ProvidersProps = {
  children: ReactNode;
  /** Lidos dos cookies no servidor: a primeira tela já sai no tema certo. */
  accessibility: AccessibilitySettings;
  prefersDark: boolean;
};

export function Providers({ children, accessibility, prefersDark }: ProvidersProps) {
  return (
    <EmotionRegistry>
      <AccessibilityProvider initial={accessibility}>
        <ThemedApp prefersDark={prefersDark}>{children}</ThemedApp>
      </AccessibilityProvider>
    </EmotionRegistry>
  );
}
