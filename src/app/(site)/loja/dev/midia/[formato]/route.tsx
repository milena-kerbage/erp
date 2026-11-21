import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import { fotoParaModelo, gerarMidia, respostaMidia } from "@/loja/lib/seo/midia/gerar";
import { type DadosMidia, FORMATOS, type Formato } from "@/loja/lib/seo/midia/modelos";

// Pré-visualização dos modelos para design/marketing: /dev/midia/og?modelo=produto&foto=1
// Só em desenvolvimento. Em produção não existe rota que aceite texto livre (viraria gerador de
// imagem com a marca do ateliê para golpes); a imagem real sai do opengraph-image de cada página.
const EXEMPLOS: Record<string, DadosMidia> = {
  produto: {
    tipo: "produto",
    nome: "Kit berço Jardim rosê 9 peças",
    categoria: "Kit berço · Kits completos",
    preco: "R$ 1.490,00",
    antesDoPreco: "a partir de",
    complemento: "5% OFF no Pix",
    selo: "Pronta entrega",
  },
  categoria: {
    tipo: "categoria",
    etiqueta: "Categoria",
    titulo: "Kits de berço completos",
    subtitulo: "Para menina, menino ou neutros, em percal, tricoline e linho, com bordado do nome.",
  },
  conteudo: {
    tipo: "conteudo",
    etiqueta: "Guia",
    titulo: "Lista de enxoval: o que comprar de verdade",
    subtitulo: "O essencial do primeiro mês, peça por peça, sem exagero.",
  },
};

export async function GET(request: NextRequest, ctx: RouteContext<"/loja/dev/midia/[formato]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { formato } = await ctx.params;
  const modelo = request.nextUrl.searchParams.get("modelo") ?? "produto";
  if (!(formato in FORMATOS) || !(modelo in EXEMPLOS)) notFound();
  // &foto=1: com uma foto do ateliê (public/vitrine/fotos), para ver o modelo como sai com o catálogo real.
  const imagem = request.nextUrl.searchParams.has("foto") ? await fotoParaModelo("/vitrine/fotos/berco-helena.webp", request.nextUrl.origin) : undefined;
  return respostaMidia(await gerarMidia({ ...EXEMPLOS[modelo], imagem }, formato as Formato));
}
