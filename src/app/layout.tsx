import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/providers";
import { ACCESSIBILITY_COOKIE, SCHEME_COOKIE, accessibilityAttributes, parseAccessibility } from "@/lib/accessibility";
import { fontVariables } from "@/styles/fonts";
import { buildTheme } from "@/styles/theme";
import "@/styles/reset.css";

const APP_NAME = "Ateliê Milena Kerbage";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.ateliemilenakerbage.com.br"),
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "Sistema interno de gestão do Ateliê Milena Kerbage.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  appleWebApp: {
    title: APP_NAME,
    capable: true,
    statusBarStyle: "default",
  },
};

export async function generateViewport(): Promise<Viewport> {
  // Barra do navegador na cor do fundo do app: branco no tema claro (escuro no
  // escuro), conforme a aparência escolhida, e não a do sistema
  const cookieStore = await cookies();
  const accessibility = parseAccessibility(cookieStore.get(ACCESSIBILITY_COOKIE)?.value);
  const prefersDark = cookieStore.get(SCHEME_COOKIE)?.value === "dark";
  const dark = accessibility.appearance === "dark" || (accessibility.appearance === "system" && prefersDark);

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
    themeColor: buildTheme({ dark, highContrast: accessibility.highContrast }).palette.neutral[0],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Acessibilidade vem do cookie: tema, tamanho do texto etc. já no primeiro HTML
  const cookieStore = await cookies();
  const accessibility = parseAccessibility(cookieStore.get(ACCESSIBILITY_COOKIE)?.value);
  const prefersDark = cookieStore.get(SCHEME_COOKIE)?.value === "dark";

  return (
    <html lang="pt-BR" className={fontVariables} {...accessibilityAttributes(accessibility)}>
      <body>
        <Providers accessibility={accessibility} prefersDark={prefersDark}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
