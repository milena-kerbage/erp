import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingExcludes: { "/*": ["./.data/**/*", "./.env*", "./.vercel/**/*"] },
  outputFileTracingIncludes: {
    "/api/whatsapp/management/guide": ["./docs/painel-gestor-whatsapp.md", "./docs/whatsapp-meta.md", "./docs/pendencias-implantacao-whatsapp.md"],
    "/api/erp/documentation": ["./docs/erp-backend.md", "./docs/erp-operacao.md"],
  },
  // Desenvolvimento: libera abrir pelo IP da rede local (celular na mesma Wi-Fi)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "@phosphor-icons/react/ssr"],
  },
  compiler: {
    emotion: true,
  },
  async headers() {
    return [
      {
        // Sistema interno: bloqueia indexação de qualquer rota ou arquivo
        source: "/:path*",
        headers: [
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
