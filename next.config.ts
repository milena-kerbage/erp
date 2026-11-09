import type { NextConfig } from "next";
import { regexHostsDaLoja } from "./src/lib/hosts";
import { origemDaMidia } from "./src/loja/lib/midia";

// Loja (www./domínio principal) e ERP (erp.) no mesmo deploy: cabeçalhos por host (src/lib/hosts.ts).
const hostsDaLoja = [{ type: "host" as const, value: regexHostsDaLoja() }];
const origemMidia = origemDaMidia();

const nextConfig: NextConfig = {
  // Build de validação sem tocar no .next do `next dev` em andamento: NEXT_DIST_DIR=.next-validacao next build.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Permite apenas o domínio configurado e a pasta de mídia pública da loja.
    remotePatterns: origemMidia ? [new URL(`${origemMidia}/vitrine/**`)] : [],
    // Fotos dos produtos cadastradas no ERP (rota /api/catalogo/imagem/:id?v=<hash>): o `v` muda quando a
    // foto muda. Os demais arquivos locais seguem sem query string (padrão do Next 16).
    localPatterns: [{ pathname: "/**", search: "" }, { pathname: "/api/catalogo/imagem/**" }],
  },
  outputFileTracingExcludes: { "/*": ["./.data/**/*", "./.env*", "./.vercel/**/*"] },
  outputFileTracingIncludes: {
    "/api/whatsapp/management/guide": ["./docs/painel-gestor-whatsapp.md", "./docs/whatsapp-meta.md", "./docs/pendencias-implantacao-whatsapp.md"],
    "/api/erp/documentation": ["./docs/erp-backend.md", "./docs/erp-operacao.md"],
  },
  // Desenvolvimento: libera abrir pelo IP da rede local (celular na mesma Wi-Fi)
  // e por 127.0.0.1, origem exigida pelo AUTH_ORIGIN do login
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "www.localhost", "loja.localhost"],
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "@phosphor-icons/react/ssr"],
    // O proxy (src/proxy.ts) copia o corpo da requisição até este limite (padrão 10 MB). A API de
    // avaliações da loja aceita até 13 MiB (4 fotos de 3 MiB + campos) e recusa o excesso com 413.
    proxyClientMaxBodySize: "14mb",
  },
  compiler: {
    emotion: true,
  },
  async headers() {
    const comuns = [
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
    ];
    return [
      { source: "/:path*", headers: comuns },
      {
        // ERP (sistema interno): bloqueia indexação de qualquer rota ou arquivo
        source: "/:path*",
        missing: hostsDaLoja,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
        ],
      },
      {
        // Loja pública: indexável; referência de origem preservada para atribuição de campanhas
        source: "/:path*",
        has: hostsDaLoja,
        headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
    ];
  },
};

export default nextConfig;
