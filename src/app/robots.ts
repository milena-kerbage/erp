import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { ehHostDaLoja } from "@/lib/hosts";
import { ORIGEM, REGRAS_SEO } from "@/loja/lib/seo/config";
import { regrasRobots } from "@/loja/lib/seo/urls";

// Um robots.txt por host:
// - loja: gerado da mesma fonte do motor de URLs (o que ele marca como não indexável é bloqueado).
//   Bots de busca e de IA liberados (seo.md §9.3); nunca bloquear /_next/ (Googlebot renderiza JS).
// - ERP (erp. e demais hosts): sistema interno, nada indexável.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  if (!ehHostDaLoja(host)) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...regrasRobots(REGRAS_SEO), "/api/", "/dev/", "/loja/"] }],
    sitemap: `${ORIGEM}/sitemap.xml`,
    host: ORIGEM,
  };
}
