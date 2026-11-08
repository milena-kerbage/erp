import type { Metadata, Viewport } from "next";
import { ORIGEM } from "@/loja/lib/seo/config";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

// Raiz da loja (www. e domínio principal). Separada da raiz do ERP (src/app/(erp)/layout.tsx):
// cada uma carrega só os próprios estilos (Panda aqui, Emotion lá).
// Mesmas fontes do ERP, servidas pelo próprio domínio pelo next/font: Inter no texto e Scarlett,
// a fonte da marca, só em destaques sem acento.
export const metadata: Metadata = {
  metadataBase: new URL(ORIGEM),
  title: {
    default: "Ateliê Milena Kerbage | Enxoval e quarto de bebê",
    template: "%s | Ateliê Milena Kerbage",
  },
  description:
    "Kit berço, enxoval, quarto de bebê e maternidade feitos no Ateliê Milena Kerbage, em Fortaleza. Peças a pronta entrega e projetos personalizados, com entrega para todo o Brasil.",
  openGraph: { siteName: "Ateliê Milena Kerbage", locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, "max-image-preview": "large" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FCFCF8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body>
        <link rel="search" type="application/opensearchdescription+xml" title="Ateliê Milena Kerbage" href="/opensearch.xml" />
        {children}
      </body>
    </html>
  );
}
