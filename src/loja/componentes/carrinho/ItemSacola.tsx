"use client";

import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Minus, Plus, Trash } from "@/loja/componentes/icones";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { atributosDoItem } from "@/loja/lib/carrinho/linhas";
import { centavos, PRODUCAO_ENCOMENDA, PRODUCAO_PRONTA, textoPrazo } from "@/loja/lib/carrinho/totais";
import type { ItemCarrinho } from "./estado";
import { linkAcao } from "./estilos";
import { FotoItem } from "./FotoItem";
import { reais } from "./Resumo";

// Situação da peça (a linha "Free 30-day returns" da referência): prazo de produção e trocas. Projeto
// e quartinho personalizado têm o próprio prazo (20 a 35 dias úteis) e são feitos sob medida.
export function situacaoDe(produto: ProdutoCarrinho, item?: Pick<ItemCarrinho, "personalizacao">): string {
  if (produto.producao) return `Projeto sob encomenda · produção de ${textoPrazo(produto.producao)}`;
  const prazo = produto.prontaEntrega
    ? `Pronta entrega · sai em até ${textoPrazo(PRODUCAO_PRONTA)}`
    : `Sob encomenda · produção de ${textoPrazo(PRODUCAO_ENCOMENDA)}`;
  // [CONFIRMAR] com o jurídico: peça bordada com o nome só troca por defeito.
  return item?.personalizacao === "com" ? prazo : `${prazo} · Trocas em até 7 dias`;
}

// Linhas de atributos (12, cinza): cor, tamanho do berço, bordado e a unidade quando não é "peça"; no
// projeto, pacote, opcionais e paleta; no quartinho, tema, paleta, berço, bordado e os módulos.
export const atributosDe = atributosDoItem;

export const hrefDe = (produto: Pick<ProdutoCarrinho, "href" | "slug">) => produto.href ?? `/produto/${produto.slug}`;

// Item da sacola (lululemon-sacola.md §4): foto 5:6 à esquerda (mín. 210 no desktop, metade da largura
// no celular, ocupando 2 linhas), à direita situação, nome, preço, atributos e a pílula de quantidade;
// embaixo, "Salvar nos favoritos · Editar · Remover".
export function ItemSacola({
  item,
  produto,
  aoMudarQuantidade,
  aoRemover,
  aoEditar,
  aoSalvar,
}: {
  item: ItemCarrinho;
  produto: ProdutoCarrinho;
  aoMudarQuantidade: (quantidade: number) => void;
  aoRemover: () => void;
  aoEditar: () => void;
  aoSalvar?: () => void; // só peças do catálogo vão para os favoritos
}) {
  const unitario = centavos(produto.preco);
  const total = unitario * item.quantidade;
  const href = hrefDe(produto);
  return (
    <li className={cx("group", tile)}>
      <Link href={href} tabIndex={-1} aria-hidden className={foto}>
        <FotoItem produto={produto} segunda sizes="(min-width: 992px) 240px, 50vw" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
      </Link>

      <div className={info}>
        <p className={css({ fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>{situacaoDe(produto, item)}</p>
        <Link href={href} className={nome}>
          {produto.nome}
        </Link>
        <p className={css({ fontSize: "sm", lineHeight: "texto", color: "escuro" })}>
          <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
          {reais(total)}
          {item.quantidade > 1 && <span className={css({ color: "textoSuave" })}> · {reais(unitario)} cada</span>}
        </p>
        <ul className={css({ display: "grid", gap: "0.5", fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
          {atributosDe(produto, item).map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
        <Quantidade quantidade={item.quantidade} nome={produto.nome} aoMudar={aoMudarQuantidade} aoRemover={aoRemover} />
      </div>

      <div className={acoes}>
        {aoSalvar && (
          <button type="button" onClick={aoSalvar} className={linkAcao}>
            Salvar nos favoritos
          </button>
        )}
        {/* O quartinho personalizado é editado no próprio montador (link); o resto, na gaveta. */}
        <button type="button" onClick={aoEditar} aria-haspopup={produto.tipo === "personalizado" ? undefined : "dialog"} className={linkAcao}>
          Editar <span className={css({ srOnly: true })}>{produto.nome}</span>
        </button>
        <button type="button" onClick={aoRemover} aria-haspopup="dialog" className={linkAcao}>
          Remover <span className={css({ srOnly: true })}>{produto.nome}</span>
        </button>
      </div>
    </li>
  );
}

// Pílula − n + de 134 × 44. Em 1, o "−" vira a lixeira e abre a confirmação de remover.
export function Quantidade({
  quantidade,
  nome,
  aoMudar,
  aoRemover,
}: {
  quantidade: number;
  nome: string;
  aoMudar: (quantidade: number) => void;
  aoRemover?: () => void;
}) {
  const remove = quantidade <= 1 && aoRemover;
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de controles da quantidade
    <div role="group" aria-label={`Quantidade de ${nome}`} className={pilula}>
      <button
        type="button"
        aria-label={remove ? `Remover ${nome} da sacola` : `Diminuir quantidade de ${nome}`}
        aria-haspopup={remove ? "dialog" : undefined}
        disabled={quantidade <= 1 && !aoRemover}
        onClick={() => (remove ? aoRemover() : aoMudar(quantidade - 1))}
        className={passo}
      >
        {remove ? <Trash size={16} aria-hidden /> : <Minus size={16} aria-hidden />}
      </button>
      <span aria-hidden className={css({ flex: "1", textAlign: "center", fontSize: "sm", fontWeight: "medium", color: "escuro" })}>
        {quantidade}
      </span>
      <span className={css({ srOnly: true })}>{`${quantidade} ${quantidade === 1 ? "unidade" : "unidades"}`}</span>
      <button
        type="button"
        aria-label={`Aumentar quantidade de ${nome}`}
        disabled={quantidade >= 999}
        onClick={() => aoMudar(quantidade + 1)}
        className={passo}
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}

const tile = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", desktop: "minmax(token(sizes.fotoSacola), 3fr) minmax(0, 9fr)" },
  columnGap: { base: "2", desktop: "5" },
  rowGap: { base: "5", desktop: "4" },
  py: "5",
  bg: "fundo",
  borderBottomWidth: "1px",
  borderColor: "borda",
  _first: { borderTopWidth: "1px" },
});

const foto = css({
  display: "block",
  gridRow: { desktop: "1 / span 2" },
  alignSelf: "start",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const info = css({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: { base: "3", desktop: "4" }, minW: "0" });

const nome = css({
  fontSize: "sm",
  fontWeight: "normal",
  lineHeight: "texto",
  color: "escuro",
  lineClamp: "2",
  textDecorationThickness: "1px",
  textUnderlineOffset: "[4px]",
  _hover: { textDecoration: "underline" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

const acoes = css({
  gridColumn: { base: "1 / -1", desktop: "2" },
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: "6",
  rowGap: "2",
});

const pilula = css({
  display: "flex",
  alignItems: "center",
  w: "quantidadeSacola",
  h: "11",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
});

const passo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "11",
  h: "[42px]",
  borderRadius: "pilula",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "fundoSutil" },
  _disabled: { color: "desabilitado", cursor: "not-allowed", _hover: { bg: "transparent" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
