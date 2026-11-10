import { arquivoDaImagem } from "@/lib/loja/gestao/imagens";
import { erroDaApi } from "@/loja/lib/contas/servidor";

// GET /api/catalogo/imagem/{id}?tamanho=mini|grande&v=<hash>: foto de um produto ATIVO da loja (WebP já
// recomprimido e sem metadados, cadastrada no ERP). Cada foto tem id próprio e o conteúdo nunca muda:
// cache longo e imutável, com ETag para a revalidação condicional. Produto em rascunho/arquivado: 404.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tamanho = new URL(request.url).searchParams.get("tamanho") === "mini" ? "mini" : "grande";
  try {
    const foto = await arquivoDaImagem(id, tamanho, true,undefined,new URL(request.url).searchParams.get('formato')==='avif'?'avif':'webp');
    // O endereço muda quando a foto muda (id próprio + ?v=hash + ?formato): a CDN guarda 1 ano e quase
    // nunca chama esta função de novo. Sem Vary: o formato vem na URL, não no Accept (Vary por navegador
    // só fragmentaria o cache da CDN). stale-if-error: se o banco ou a R2 caírem, a CDN segue servindo.
    const cabecalhos = { ETag: foto.etag, "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable, stale-if-error=31536000", "X-Content-Type-Options": "nosniff" };
    if (request.headers.get("if-none-match") === foto.etag) return new Response(null, { status: 304, headers: cabecalhos });
    return new Response(new Uint8Array(foto.conteudo), {
      headers: { ...cabecalhos, "Content-Type": foto.tipo, "Content-Length": String(foto.conteudo.length), "Content-Disposition": "inline" },
    });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
