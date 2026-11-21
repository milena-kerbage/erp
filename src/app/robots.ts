import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { ehHostDaLoja } from "@/lib/hosts";
import { ORIGEM, REGRAS_SEO } from "@/loja/lib/seo/config";
import { regrasRobots } from "@/loja/lib/seo/urls";

// Um robots.txt por host:
// - loja: gerado da mesma fonte do motor de URLs (o que ele marca como não indexável é bloqueado).
//   Bots de busca e de IA liberados (seo.md §9.3); nunca bloquear /_next/ (Googlebot renderiza JS).
// - ERP (app. e demais hosts): sistema interno bloqueado, menos as páginas públicas exigidas pela Meta (privacidade,
//   termos, exclusão de dados): o robô que valida esses links no painel da Meta obedece ao robots.txt.
const PAGINAS_PUBLICAS_ERP = ["/privacidade", "/termos", "/exclusao-de-dados", "/cookies", "/politicas", "/politica-de-comunicacao"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host");
  if (!ehHostDaLoja(host)) return { rules: { userAgent: "*", allow: PAGINAS_PUBLICAS_ERP, disallow: "/" } };
  return {
    // As fotos dos produtos saem de /api/catalogo/imagem/ e as imagens de compartilhamento de /og/: liberadas
    // (a regra mais específica vence o bloqueio de /api/), senão o Google não indexa as fotos nem as redes buscam a prévia.
    rules: [{ userAgent: "*", allow: ["/", "/api/catalogo/imagem/", "/og/"], disallow: [...regrasRobots(REGRAS_SEO), "/api/", "/dev/", "/loja/"] }],
    sitemap: `${ORIGEM}/sitemap.xml`,
    host: ORIGEM,
  };
}
