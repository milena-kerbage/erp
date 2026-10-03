/**
 * Preferências de acessibilidade: tipos, padrão e leitura do cookie. Sem
 * "use client": o layout raiz (servidor) usa para já renderizar no tema certo.
 */

export type TextSize = "default" | "large" | "larger";
export type Motion = "system" | "reduce" | "always";
export type Appearance = "light" | "dark" | "system";

export type AccessibilitySettings = {
  appearance: Appearance;
  textSize: TextSize;
  highContrast: boolean;
  underlineLinks: boolean;
  readableSpacing: boolean;
  motion: Motion;
  focusAlways: boolean;
};

export const defaultAccessibility: AccessibilitySettings = {
  appearance: "light",
  textSize: "default",
  highContrast: false,
  underlineLinks: false,
  readableSpacing: false,
  motion: "system",
  focusAlways: false,
};

/** Cookie com as escolhas (o servidor lê para já renderizar certo, sem piscar). */
export const ACCESSIBILITY_COOKIE = "mk_a11y";
/** Tema do sistema operacional, para o modo "Como no sistema" no servidor. */
export const SCHEME_COOKIE = "mk_scheme";

/** Lê o cookie salvo, ignorando valores inválidos. */
export function parseAccessibility(raw: string | undefined): AccessibilitySettings {
  if (!raw) return defaultAccessibility;
  try {
    return { ...defaultAccessibility, ...JSON.parse(decodeURIComponent(raw)) };
  } catch {
    return defaultAccessibility;
  }
}

/** Atributos do <html> que o CSS global usa (mesmos no servidor e no cliente). */
export function accessibilityAttributes(settings: AccessibilitySettings): Record<string, string | undefined> {
  return {
    "data-text-size": settings.textSize === "default" ? undefined : settings.textSize,
    "data-contrast": settings.highContrast ? "high" : undefined,
    "data-underline-links": settings.underlineLinks ? "" : undefined,
    "data-readable-spacing": settings.readableSpacing ? "" : undefined,
    "data-motion": settings.motion === "system" ? undefined : settings.motion,
    "data-focus-always": settings.focusAlways ? "" : undefined,
  };
}
