import { MODULOS } from "@/loja/lib/modulos";
import { arvoreDaLoja } from "@/lib/loja/catalogo";
import { EMPRESA, REDES_SOCIAIS } from "@/loja/lib/empresa";
import { ORIGEM } from "@/loja/lib/seo/config";
import { PAGINAS_INSTITUCIONAIS } from "@/loja/lib/seo/institucional";

// GET /llms.txt: resumo da loja em Markdown para assistentes de IA (ChatGPT, Perplexity, Claude…), no formato
// proposto em llmstxt.org. O Google não usa este arquivo (as respostas de IA dele leem as páginas indexadas e os
// dados estruturados); serve aos assistentes que o procuram. Só fatos que o site já publica.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROTULOS: Record<string, string> = {
  "/sobre": "Sobre o ateliê",
  "/indique": "Indique o ateliê",
  "/ajuda": "Central de ajuda",
  "/ajuda/como-fazer-pedido": "Como fazer o pedido",
  "/ajuda/entregas": "Entregas e retirada",
  "/ajuda/trocas-e-devolucoes": "Trocas e devoluções",
  "/ajuda/bordado-personalizado": "Bordado personalizado",
  "/ajuda/tecidos-e-cuidados": "Tecidos e cuidados",
  "/ajuda/perguntas-frequentes": "Perguntas frequentes",
  "/politicas": "Políticas",
  "/politicas/privacidade": "Política de privacidade",
  "/politicas/termos": "Termos de uso",
  "/politicas/cookies": "Política de cookies",
  "/politicas/trocas": "Política de trocas e devoluções",
};

export async function GET() {
  // Categorias do 1º nível (as do menu), na ordem de exibição; "personalizado" tem a própria linha.
  const categorias = (await arvoreDaLoja()).lista.filter((categoria) => !categoria.chave.includes("/") && categoria.chave !== "personalizado");
  const corpo = [
    `# ${EMPRESA.nomeFantasia}`,
    "",
    `> ${EMPRESA.segmento} feitos no ateliê, em ${EMPRESA.cidade}/${EMPRESA.uf}. ${EMPRESA.entrega}. O site é um catálogo com preços "a partir de": a cliente monta o enxoval e o pedido é finalizado pelo WhatsApp, com uma vendedora.`,
    "",
    "- Peças: kit berço, kit cama, kit maternidade, paninhos, itens para presentear e complementos do enxoval.",
    "- Tecidos: percal 230 fios ou 400 fios egípcios (o segundo é um acréscimo sobre o valor inicial).",
    "- Qualquer peça pode ser personalizada ou modificada (cores, bordado com o nome do bebê, medidas).",
    `- Pedido e atendimento: WhatsApp ${EMPRESA.whatsapp.exibicao} (${EMPRESA.horarioAtendimento}). Não há pagamento no site.`,
    "- Valores do site são iniciais (\"a partir de\"); o valor final, o frete e o prazo são confirmados na conversa.",
    `- Retirada no ateliê em ${EMPRESA.cidade} ou envio para todo o Brasil.`,
    `- Empresa: ${EMPRESA.razaoSocial}, CNPJ ${EMPRESA.cnpj}. ${EMPRESA.endereco}.`,
    "",
    "## Categorias",
    "",
    ...categorias.map((categoria) => `- [${categoria.rotulo}](${ORIGEM}/${categoria.chave})`),
    ...(MODULOS.prontaEntrega ? [`- [Pronta entrega](${ORIGEM}/pronta-entrega): peças que saem do ateliê em até 2 dias úteis`] : []),
    ...(MODULOS.personalizado ? [`- [Personalizado](${ORIGEM}/personalizado): quartinho completo e o montador do zero`] : []),
    "",
    "## Ajuda e políticas",
    "",
    ...PAGINAS_INSTITUCIONAIS.map((caminho) => `- [${ROTULOS[caminho] ?? caminho}](${ORIGEM}${caminho})`),
    "",
    "## Mais",
    "",
    `- [Mapa do site](${ORIGEM}/sitemap.xml)`,
    `- [Instagram](${REDES_SOCIAIS.instagram})`,
    "",
  ].join("\n");
  return new Response(corpo, {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" },
  });
}
