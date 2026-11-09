// Fotos do catálogo de exemplo. Ainda NÃO há fotos das peças do ateliê: todo produto cai no bloco
// de espera (FotoProduto: fundo de estúdio com o ícone de bebê em sálvia suave).
// Quando as fotos chegarem, cada peça ganha a pasta public/vitrine/produtos/<slug>/ com:
// - principal.webp: 1600 × 1600, fundo de estúdio (token fundoProduto), peça inteira e centralizada;
// - detalhe.webp: a mesma peça de perto (renda, bordado, caimento), a 2ª foto que o card mostra no hover.
// Basta registrar o slug e a descrição em ALTS abaixo. Quando a API de catálogo existir, as fotos
// vêm do cadastro do produto no ERP e este arquivo sai.

import { origemDaMidia } from '../midia';

export type TipoImagem = "principal" | "aplicacao" | "detalhe";
export type ImagemProduto = { src: string; alt: string; tipo: TipoImagem };
export type Foto = Pick<ImagemProduto, "src" | "alt">; // o que cards e miniaturas precisam

const PASTA = `${origemDaMidia()}/vitrine/produtos`;

const principal = (slug: string, alt: string): ImagemProduto => ({ src: `${PASTA}/${slug}/principal.webp`, alt, tipo: "principal" });
const detalhe = (slug: string, alt: string): ImagemProduto => ({
  src: `${PASTA}/${slug}/detalhe.webp`,
  alt: `${alt}, de perto`,
  tipo: "detalhe",
});

// slug → descrição da foto principal (texto alternativo). Vazio até as fotos reais existirem.
// Exemplo: "kit-berco-jardim-rose": "Kit berço floral rosê montado num berço branco, visto de frente".
const ALTS: Record<string, string> = {};

const IMAGENS = new Map(Object.entries(ALTS).map(([slug, alt]) => [slug, [principal(slug, alt), detalhe(slug, alt)]]));

// Foto cadastrada no ERP, servida pela rota da loja já em WebP recomprimido (1600 px, sem metadados) e
// com cache longo: vai direto ao navegador, sem o otimizador do next/image (que busca o arquivo por uma
// requisição interna, fora do host da loja).
export const ehFotoDoCatalogo = (src: unknown) => typeof src === "string" && src.startsWith("/api/catalogo/imagem/");

export function imagensDe(slug: string): ImagemProduto[] | undefined {
  return IMAGENS.get(slug);
}

export function fotoPrincipal(produto: { imagens?: ImagemProduto[] }): Foto | undefined {
  const foto = produto.imagens?.find((imagem) => imagem.tipo === "principal") ?? produto.imagens?.[0];
  return foto && { src: foto.src, alt: foto.alt };
}

// A 2ª foto do card (hover): a primeira que não é a principal.
export function segundaFoto(produto: { imagens?: ImagemProduto[] }): Foto | undefined {
  const foto = produto.imagens?.find((imagem) => imagem.tipo !== "principal");
  return foto && { src: foto.src, alt: foto.alt };
}
