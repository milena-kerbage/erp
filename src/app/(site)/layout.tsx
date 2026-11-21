import type { Metadata, Viewport } from "next";
import { SincronizarCarrinho } from "@/loja/componentes/carrinho/SincronizarCarrinho";
import { AvisoCookies } from "@/loja/componentes/cookies/AvisoCookies";
import { ALT_PADRAO, IMAGEM_PADRAO, SITE } from "@/loja/lib/seo/compartilhar";
import { ORIGEM } from "@/loja/lib/seo/config";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

// Raiz da loja (www. e domínio principal). Separada da raiz do ERP (src/app/(erp)/layout.tsx):
// cada uma carrega só os próprios estilos (Panda aqui, Emotion lá).
// Mesmas fontes do ERP, servidas pelo próprio domínio pelo next/font: Inter no texto e Scarlett,
// a fonte da marca, só em destaques sem acento.
const TITULO = "Ateliê Milena Kerbage | Enxoval e quarto de bebê";
const DESCRICAO =
  "Kit berço, enxoval, quarto de bebê e maternidade feitos no Ateliê Milena Kerbage, em Fortaleza. Peças a pronta entrega e quartinhos personalizados, com entrega para todo o Brasil.";

export const metadata: Metadata = {
  metadataBase: new URL(ORIGEM),
  title: {
    default: TITULO,
    template: "%s | Ateliê Milena Kerbage",
  },
  description: DESCRICAO,
  applicationName: "Ateliê Milena Kerbage",
  // Padrão de compartilhamento (WhatsApp, Instagram, Facebook, X) para as páginas sem `openGraph` próprio: só o
  // site e a imagem; o título e a descrição o Next copia de cada página. Quem define o seu usa compartilhamento().
  openGraph: { siteName: SITE, locale: "pt_BR", type: "website", images: [{ url: IMAGEM_PADRAO, width: 1200, height: 630, alt: ALT_PADRAO, type: "image/jpeg" }] },
  twitter: { card: "summary_large_image", images: [{ url: IMAGEM_PADRAO, alt: ALT_PADRAO }] },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  formatDetection: { telephone: false, address: false, email: false },
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
        <SincronizarCarrinho />
        <AvisoCookies />
      </body>
    </html>
  );
}
