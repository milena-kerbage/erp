import type { Metadata } from "next";

// Metadados de compartilhamento (Open Graph e X) de qualquer página da loja. No Next, `openGraph` de uma página
// SUBSTITUI o do layout inteiro: por isso todo lugar monta os dois por aqui, sempre com o nome do site, o idioma e
// a imagem. As imagens saem de /og/** (src/app/(site)/loja/og), fora do prefixo interno /loja/, que o robots.txt
// bloqueia: os robôs do Facebook, do Instagram e do LinkedIn obedecem ao robots.txt antes de buscar a imagem.
export const SITE = "Ateliê Milena Kerbage";
export const IMAGEM_PADRAO = "/og/inicio";
export const ALT_PADRAO = "Ateliê Milena Kerbage: enxoval e quarto de bebê, em Fortaleza";

type Entrada = {
  titulo: string;
  descricao: string;
  caminho: string; // URL pública (canonical), ex.: /produto/kit-berco-bia
  imagem?: string; // caminho de /og/** ou de uma foto; padrão: a imagem da marca
  alt?: string;
};

/** `openGraph` e `twitter` completos para espalhar no metadata da página. */
export function compartilhamento({ titulo, descricao, caminho, imagem = IMAGEM_PADRAO, alt = ALT_PADRAO }: Entrada): Pick<Metadata, "openGraph" | "twitter"> {
  const imagens = [{ url: imagem, width: 1200, height: 630, alt, type: "image/jpeg" }];
  return {
    openGraph: { title: titulo, description: descricao, url: caminho, siteName: SITE, locale: "pt_BR", type: "website", images: imagens },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, images: imagens.map(({ url, alt: texto }) => ({ url, alt: texto })) },
  };
}

/** Versão do catálogo na URL da imagem: mudou o cadastro, muda a URL e as redes buscam de novo. */
export const comVersao = (caminho: string, versao: string) => `${caminho}?v=${encodeURIComponent(versao.slice(0, 24))}`;

/** Título sem a marca repetida no fim ("… | Milena Kerbage"): o layout já acrescenta "| Ateliê Milena Kerbage". */
export const semMarca = (titulo: string) => titulo.replace(/(\s*[|·–-]\s*(Ateliê\s+)?Milena Kerbage)+\s*$/i, "").trim() || titulo;

/**
 * Catálogo real (cadastro do ERP) entra no índice do Google; o de exemplo em código (banco fora do ar ou
 * vazio), com preços fictícios, nunca.
 */
export const robotsDoCatalogo = (origem: "banco" | "estatico") =>
  origem === "banco" ? { index: true, follow: true, "max-image-preview": "large" as const, "max-snippet": -1 } : { index: false, follow: true };
