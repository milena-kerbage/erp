import "server-only";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { arquivoDaImagem } from "@/lib/loja/gestao/imagens";
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

const paraDataUri = async (conteudo: Buffer, lado: number) =>
  `data:image/jpeg;base64,${(await sharp(conteudo).rotate().resize(lado, lado, { fit: "cover", position: "attention" }).jpeg({ quality: 88 }).toBuffer()).toString("base64")}`;

/**
 * Foto de um produto pronta para o modelo: quadrada, cortada no ponto de interesse (sharp "attention").
 * As fotos do cadastro do ERP (/api/catalogo/imagem/{id}) vêm direto do armazenamento, sem uma volta pela
 * internet; as demais (arquivos do deploy ou a origem de mídia) são buscadas pela URL. Sem foto, o modelo
 * sai só com o texto: nunca derruba o compartilhamento.
 */
export async function fotoParaModelo(src: string | undefined, origem: string, lado = 900): Promise<string | undefined> {
  if (!src) return undefined;
  try {
    const cadastro = /^\/api\/catalogo\/imagem\/([A-Za-z0-9_-]{1,80})(?:\?|$)/.exec(src);
    if (cadastro) return await paraDataUri((await arquivoDaImagem(cadastro[1], "grande", true)).conteudo, lado);
    // Arquivos do deploy (/vitrine/**): direto do disco quando existir (desenvolvimento); na Vercel, pela URL.
    if (src.startsWith("/vitrine/") && !src.includes("..")) {
      const arquivo = await readFile(join(/* turbopackIgnore: true */ process.cwd(), "public", normalize(src.split("?")[0]))).catch(() => null);
      if (arquivo) return await paraDataUri(arquivo, lado);
    }
    const resposta = await fetch(new URL(src, origem), { signal: AbortSignal.timeout(4000) });
    if (!resposta.ok) return undefined;
    return await paraDataUri(Buffer.from(await resposta.arrayBuffer()), lado);
  } catch {
    return undefined;
  }
}
