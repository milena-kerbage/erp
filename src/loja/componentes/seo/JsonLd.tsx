import { jsonLd } from "@/loja/lib/seo/produto";

// Dados estruturados no HTML inicial (seo.md §2: o Google lê Product do HTML, não do JS).
export function JsonLd({ dados }: { dados: unknown }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD montado no servidor a partir do catálogo, com "<" escapado (jsonLd); é o padrão documentado pelo Next
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dados) }} />;
}
