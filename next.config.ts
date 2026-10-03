import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
