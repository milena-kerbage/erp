"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  ACCESSIBILITY_COOKIE,
  SCHEME_COOKIE,
  accessibilityAttributes,
  defaultAccessibility,
  type AccessibilitySettings,
} from "@/lib/accessibility";

export {
  defaultAccessibility,
  type AccessibilitySettings,
  type Appearance,
  type Motion,
  type TextSize,
} from "@/lib/accessibility";

const YEAR = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${YEAR}; samesite=lax`;
}

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  update: (patch: Partial<AccessibilitySettings>) => void;
  reset: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

/**
 * Preferências de acessibilidade de quem está usando (tema, tamanho do
 * texto, contraste, animações...). Ficam num cookie deste navegador.
 */
export function AccessibilityProvider({
  children,
  initial = defaultAccessibility,
}: {
  children: ReactNode;
  initial?: AccessibilitySettings;
}) {
  const [settings, setSettings] = useState(initial);

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(accessibilityAttributes(settings))) {
      if (value === undefined) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
    writeCookie(ACCESSIBILITY_COOKIE, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback((patch: Partial<AccessibilitySettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(defaultAccessibility), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibility precisa estar dentro de <AccessibilityProvider>");
  return context;
}

/** Guarda o tema do sistema para o servidor acertar o "Como no sistema". */
export function rememberScheme(dark: boolean) {
  writeCookie(SCHEME_COOKIE, dark ? "dark" : "light");
}
