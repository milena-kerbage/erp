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
    const cabecalhos = { Vary:"Accept", ETag: foto.etag, "Cache-Control": "public, max-age=31536000, s-maxage=86400, immutable", "X-Content-Type-Options": "nosniff" };
    if (request.headers.get("if-none-match") === foto.etag) return new Response(null, { status: 304, headers: cabecalhos });
    return new Response(new Uint8Array(foto.conteudo), {
      headers: { ...cabecalhos, "Content-Type": foto.tipo, "Content-Length": String(foto.conteudo.length), "Content-Disposition": "inline" },
    });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
