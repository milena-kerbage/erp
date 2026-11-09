import { fotoDaAvaliacao } from "@/lib/loja/avaliacoes";
import { erroDaApi } from "@/loja/lib/avaliacoes/servidor";

// GET /api/avaliacoes/foto/{id}?tamanho=mini|grande: foto de uma avaliação APROVADA (WebP já
// recomprimido e sem metadados). O id é aleatório e o conteúdo nunca muda: cache longo e imutável.
// Avaliação pendente, recusada ou excluída: 404.

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tamanho = new URL(request.url).searchParams.get("tamanho") === "grande" ? "grande" : "mini";
  try {
    const foto = await fotoDaAvaliacao(id, tamanho, true,new URL(request.url).searchParams.get('formato')==='avif'?'avif':'webp');
    return new Response(new Uint8Array(foto.conteudo), {
      headers: { Vary:"Accept",
        "Content-Type": foto.tipo,
        "Content-Length": String(foto.conteudo.length),
        "Cache-Control": "public, max-age=31536000, s-maxage=86400, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erro) {
    return erroDaApi(erro);
  }
}
