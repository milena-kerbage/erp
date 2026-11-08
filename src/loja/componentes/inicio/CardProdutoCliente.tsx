"use client";

import Link from "next/link";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { balao } from "@/loja/componentes/listagem/CardListagem";
import { classeDaCor } from "@/loja/componentes/produto/cores";
import type { CorProduto, FotoGaleria, VarianteCor } from "@/loja/componentes/produto/dados";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import { DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";

export type DadosCardProduto = VarianteCor & { cores: CorProduto[] };

const ROTULO_PIX = `${DESCONTO_PIX_PERCENTUAL}% OFF no Pix`;

const comoFoto = (foto?: FotoGaleria): Foto | undefined => (foto?.src ? { src: foto.src, alt: foto.alt } : undefined);

// Card de produto dos carrosséis (lululemon-referencia.md §3.7): sem borda nem raio, o link cobre o
// card inteiro; foto 5:6 (a 2ª foto entra no hover, quando houver), selo no canto inferior esquerdo,
// nome 16/500 em até 2 linhas e preço 14 à direita (no celular 14 e 12, empilhados) e o selo
// "5% OFF no Pix". Amostras de cor de 24 px, que aparecem no hover do card no desktop; no celular, sem
// bolinhas, só "N cores" (lululemon-animacoes-edicao.md §2).
// Troca de cor: hover numa bolinha mostra o balão com o nome; o clique troca a foto pela do
// produto-irmão (sem sair da página), move o anel e troca o nome, o selo, o preço e o link. Cor sem
// produto-irmão só mostra o nome.
export function CardProdutoCliente({ dados, sizes }: { dados: DadosCardProduto; sizes: string }) {
  const [corEscolhida, setCorEscolhida] = useState(() => dados.cores.find((cor) => cor.atual)?.rotulo ?? dados.cores[0]?.rotulo);
  const atual: VarianteCor = dados.cores.find((cor) => cor.rotulo === corEscolhida)?.variante ?? dados;
  const [principal, ...outras] = atual.fotos;
  const segunda = outras.find((foto) => foto.src);

  return (
    <article className={cx("group", card)}>
      <div className={css({ position: "relative" })}>
        {/* A troca de cor remonta a foto (key), que entra com fade. */}
        <div key={atual.slug} className={css({ animation: "aparecerFoto" })}>
          <FotoProduto
            foto={comoFoto(principal)}
            segunda={comoFoto(segunda)}
            cor={principal?.tom}
            sizes={sizes}
            className={css({ aspectRatio: "[5 / 6]" })}
          />
        </div>
        {atual.selo && <span className={selo}>{atual.selo}</span>}
      </div>
      <div className={info}>
        <h3 className={nome}>
          <Link href={`/produto/${atual.slug}`} className={linkCobre}>
            {atual.nome}
          </Link>
        </h3>
        <p className={preco}>
          {formatarPreco(atual.preco)}
          <span className={pix}>{ROTULO_PIX}</span>
        </p>
      </div>
      <p className={nCores}>{dados.cores.length > 1 ? `${dados.cores.length} cores` : corEscolhida}</p>
      {dados.cores.length > 0 && (
        <ul aria-label="Cores" className={listaAmostras}>
          {dados.cores.map((cor) => (
            <li key={cor.rotulo} className={css({ position: "relative", display: "flex" })}>
              {cor.variante ? (
                <button
                  type="button"
                  aria-pressed={cor.rotulo === corEscolhida}
                  aria-label={`Ver na cor ${cor.rotulo}`}
                  onClick={() => setCorEscolhida(cor.rotulo)}
                  className={amostraEstilo}
                >
                  <span className={cx(miolo, classeDaCor(cor.rotulo))} />
                </button>
              ) : (
                <span role="img" aria-label={cor.rotulo} data-atual={cor.rotulo === corEscolhida || undefined} className={amostraEstilo}>
                  <span className={cx(miolo, classeDaCor(cor.rotulo))} />
                </span>
              )}
              <span aria-hidden className={balao}>
                {cor.rotulo}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

const card = css({ position: "relative", bg: "fundo" });

const selo = css({
  position: "absolute",
  left: "3",
  bottom: "3",
  px: "2",
  py: "1",
  borderRadius: "pilula",
  bg: "controleClaro",
  fontSize: "xs",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
});

// Linha 1: nome e preço lado a lado (16/500 e 14), 8 entre eles; no celular o preço desce.
const info = css({
  display: "flex",
  flexDirection: { base: "column", desktop: "row" },
  alignItems: { base: "flex-start", desktop: "baseline" },
  justifyContent: "space-between",
  gap: { base: "1", desktop: "2" },
  pt: "4",
  px: { base: "3", desktop: "5" },
});

const nome = css({
  fontSize: { base: "sm", desktop: "md" },
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  textWrap: "pretty",
  lineClamp: "2",
});

const preco = css({
  display: "flex",
  flexDirection: { base: "row", desktop: "column" },
  alignItems: { base: "baseline", desktop: "flex-end" },
  gap: { base: "2", desktop: "0" },
  flexShrink: "0",
  fontSize: { base: "xs", desktop: "sm" },
  lineHeight: "texto",
  color: "escuro",
  whiteSpace: "nowrap",
});

const pix = css({ fontSize: "xs", color: "sucesso" });

// Celular: "N cores" (ou o nome da única cor) no lugar das bolinhas.
const nCores = css({ display: { base: "block", md: "none" }, px: "3", pt: "1", pb: "6", fontSize: "xs", lineHeight: "texto", color: "texto" });

// O link do nome se estende pelo card inteiro (as amostras ficam por cima, clicáveis).
const linkCobre = css({
  _after: { content: '""', position: "absolute", inset: "0" },
  _focusVisible: { outline: "none", _after: { boxShadow: "anelFoco" } },
});

const listaAmostras = css({
  position: "relative",
  zIndex: "[1]",
  display: { base: "none", md: "flex" },
  flexWrap: "wrap",
  gap: "1",
  pt: "4",
  px: { base: "3", desktop: "5" },
  pb: "8",
  opacity: { base: "1", desktop: "0" },
  transitionProperty: "opacity",
  transitionDuration: "sublinhado",
  transitionTimingFunction: "assinatura",
  _groupHover: { opacity: "1" },
  _groupFocusWithin: { opacity: "1" },
});

// Círculo de 24 com a cor em 20 e borda de 1 px; a cor escolhida ganha anel duplo (branco + escuro).
const amostraEstilo = css({
  display: "flex",
  cursor: "pointer",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "controle",
  alignItems: "center",
  justifyContent: "center",
  w: "6",
  h: "6",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "contornoAmostra",
  "&[aria-pressed=true], &[data-atual]": { borderColor: "escuro", boxShadow: "[inset 0 0 0 2px token(colors.superficie)]" },
  "&:is(span)": { cursor: "default" },
  _hover: { borderColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const miolo = css({ display: "block", w: "5", h: "5", borderRadius: "pilula" });
