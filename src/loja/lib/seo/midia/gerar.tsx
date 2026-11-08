import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { type DadosMidia, FORMATOS, type Formato, renderizarMidia } from "./modelos";

// JPEG: as redes aceitam com segurança e fica ~5x menor que o PNG do ImageResponse.
// Alvo < 300 KB (prévia do WhatsApp); 1200×630 sai tipicamente com 60–150 KB.
const QUALIDADE_JPEG = 84;

export async function gerarMidia(dados: DadosMidia, formato: Formato): Promise<Buffer> {
  const { largura, altura } = FORMATOS[formato];
  const png = Buffer.from(await new ImageResponse(renderizarMidia(dados, formato), { width: largura, height: altura }).arrayBuffer());
  return sharp(png).jpeg({ quality: QUALIDADE_JPEG, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
}

export function respostaMidia(jpeg: Buffer): Response {
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // A URL da imagem leva a versão do conteúdo (ex.: ?v=<updated_at>): mudou o produto, muda a URL
      // e as redes buscam de novo (elas fazem cache por URL).
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}

// O motor de imagens publica AVIF/WebP; o Satori não lê AVIF. Converte a foto para PNG em data URI.
export async function imagemParaModelo(url: string, ladoMaximo = 900): Promise<string | undefined> {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!resposta.ok) return undefined;
    const png = await sharp(Buffer.from(await resposta.arrayBuffer()))
      .resize(ladoMaximo, ladoMaximo, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return undefined; // sem foto o modelo ainda funciona; não derruba o compartilhamento
  }
}
