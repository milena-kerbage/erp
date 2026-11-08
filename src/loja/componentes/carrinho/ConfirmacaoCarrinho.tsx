"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { css, cx } from "styled-system/css";
import { FotoProjeto } from "@/loja/componentes/casas/FotoProjeto";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import { WhatsappLogo } from "@/loja/componentes/icones";
import { produtoDoProjeto, produtoDoQuartinho } from "@/loja/lib/carrinho/linhas";
import { centavos, DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import { Dialogo } from "./Dialogo";
import { type ItemCarrinho, tipoDe, useItensCarrinho, useQuantidadeNoCarrinho } from "./estado";
import { botaoClaro, botaoEscuro } from "./estilos";
import { reais } from "./Resumo";

// `preco` (opcional): preço de tabela, mostrado como "a partir de"; sem ele, vale o do catálogo da sacola.
export type Sugestao = { slug: string; nome: string; pix: string; precisaEscolher: boolean; foto?: Foto; preco?: string };

type DadosSacola = { precos: Record<string, string>; maisVendidos: Sugestao[] };

// Preço unitário do item (centavos): produto pelo catálogo da sacola; projeto e quartinho pela escolha.
function precoDoItem(item: ItemCarrinho, precos: Record<string, string>): number | null {
  const tipo = tipoDe(item);
  if (tipo === "produto") return precos[item.slug] ? centavos(precos[item.slug]) : null;
  const produto = tipo === "projeto" ? produtoDoProjeto(item) : produtoDoQuartinho(item);
  return produto ? centavos(produto.preco) : null;
}

// Preços do catálogo para o subtotal da sacola inteira (os itens vivem no navegador e a página de
// produto só conhece a própria peça). Uma busca por visita, reaproveitada a cada confirmação.
let dadosSacola: Promise<DadosSacola | null> | null = null;
function carregarDadosSacola(): Promise<DadosSacola | null> {
  dadosSacola ??= fetch("/api/carrinho")
    .then((resposta) => (resposta.ok ? (resposta.json() as Promise<DadosSacola>) : null))
    .catch(() => null);
  return dadosSacola;
}

// Confirmação "Adicionado ao seu enxoval" (lululemon-sacola.md §8): tela cheia no celular e gaveta
// da direita com véu de .5 no desktop. Título, selo "Ótima escolha", foto grande da peça e a coluna
// "Combina com" (complementos da peça; sem eles, os mais vendidos), subtotal "a partir de" da sacola
// e os botões "Ver sacola" (claro) e "Fazer pedido pelo WhatsApp" (escuro, leva ao pedido). Catálogo
// com preço: nada de valor no Pix calculado, só "5% OFF no Pix". Foco preso, Esc fecha e o foco volta
// ao botão de adicionar (<dialog> nativo).
export function ConfirmacaoCarrinho({
  aberta,
  aoFechar,
  item,
  sugestoes,
}: {
  aberta: boolean;
  aoFechar: () => void;
  // `preco` (opcional): preço de tabela da peça, para o "a partir de" (sem ele, só o selo do Pix).
  // `paleta`: projeto de quarto e quartinho personalizado (a foto é a composição nos tons da paleta).
  item: { nome: string; foto?: Foto; detalhe?: string; quantidade: number; pix: string; preco?: string; paleta?: readonly string[] };
  sugestoes: Sugestao[];
}) {
  const quantidade = useQuantidadeNoCarrinho();
  const itens = useItensCarrinho();
  const [dados, setDados] = useState<DadosSacola | null>(null);

  useEffect(() => {
    if (!aberta || dados) return;
    let ativo = true;
    carregarDadosSacola().then((resposta) => {
      if (ativo) setDados(resposta);
    });
    return () => {
      ativo = false;
    };
  }, [aberta, dados]);

  const subtotal =
    dados && itens
      ? itens.reduce((soma, atual) => soma + (precoDoItem(atual, dados.precos) ?? 0) * atual.quantidade, 0)
      : null;
  const combina = (sugestoes.length > 0 ? sugestoes : (dados?.maisVendidos ?? [])).slice(0, 6);

  return (
    <Dialogo
      aberto={aberta}
      aoFechar={aoFechar}
      titulo="Adicionado ao seu enxoval"
      variante="gaveta"
      classeTitulo={tituloConfirmacao}
      rodape={
        <>
          <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3", color: "escuro" })}>
            <p className={css({ fontSize: "lg", lineHeight: "texto" })}>
              Subtotal ({quantidade} {quantidade === 1 ? "item" : "itens"})
            </p>
            <p aria-live="polite" className={css({ fontSize: "lg", lineHeight: "texto", whiteSpace: "nowrap" })}>
              <span className={css({ fontSize: "sm", color: "textoSuave" })}>a partir de </span>
              {subtotal === null ? "…" : reais(subtotal)}
            </p>
          </div>
          <div className={css({ display: "grid", gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: "2", mt: "4" })}>
            <Link href="/carrinho" onClick={aoFechar} className={cx(botaoClaro, css({ px: "3" }))}>
              Ver sacola
            </Link>
            <Link href="/checkout" onClick={aoFechar} className={cx(botaoEscuro, css({ px: "3" }))}>
              <WhatsappLogo size={20} aria-hidden /> Fazer pedido pelo WhatsApp
            </Link>
          </div>
        </>
      }
    >
      <p className={selo}>Ótima escolha! Faça o pedido pelo WhatsApp e ela é sua.</p>

      <div className={css({ display: "grid", gridTemplateColumns: combina.length > 0 ? "[7fr 3fr]" : "[1fr]", gap: "3", mt: "6" })}>
        <div className={css({ minW: "0" })}>
          {item.paleta ? (
            <FotoProjeto paleta={item.paleta} foto={item.foto} sizes="(min-width: 768px) 360px, 70vw" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
          ) : (
            <FotoProduto foto={item.foto} sizes="(min-width: 768px) 360px, 70vw" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
          )}
          <div className={css({ display: "grid", gap: "1", mt: "4", fontSize: "sm", lineHeight: "texto" })}>
            <p className={css({ color: "escuro" })}>{item.nome}</p>
            {item.detalhe && <p className={css({ fontSize: "xs", color: "textoSuave" })}>{item.detalhe}</p>}
            <p className={css({ fontSize: "xs", color: "textoSuave" })}>Quantidade: {item.quantidade}</p>
            {item.preco && (
              <p className={css({ color: "escuro" })}>
                <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
                {formatarPreco(item.preco)}
              </p>
            )}
            <p>
              <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
            </p>
          </div>
        </div>

        {combina.length > 0 && (
          <section aria-labelledby="titulo-combina" className={css({ position: "relative", minW: "0" })}>
            <div className={css({ position: "absolute", inset: "0", display: "flex", flexDirection: "column" })}>
              <h3 id="titulo-combina" className={css({ fontSize: "sm", fontWeight: "normal", lineHeight: "texto", color: "escuro" })}>
                Combina com
              </h3>
              <ul className={colunaCombina}>
                {combina.map((sugestao) => (
                  <li key={sugestao.slug}>
                    <Link href={`/produto/${sugestao.slug}`} onClick={aoFechar} className={linkSugestao}>
                      <FotoProduto foto={sugestao.foto} sizes="140px" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
                      <span className={css({ srOnly: true })}>{sugestao.nome}, </span>
                      {(sugestao.preco ?? dados?.precos[sugestao.slug]) && (
                        <span className={css({ display: "block", mt: "1", fontSize: "xs", color: "textoSuave" })}>
                          a partir de {formatarPreco(sugestao.preco ?? dados?.precos[sugestao.slug] ?? "0")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </Dialogo>
  );
}

const tituloConfirmacao = css({ fontSize: { base: "subtitulo", md: "4xl" }, lineHeight: "titulo", letterSpacing: "titulo" });

// Selo quente claro (o "Great pick" da referência).
const selo = css({
  display: "inline-block",
  px: "3",
  py: "2",
  borderRadius: "md",
  bg: "alertaSuave",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
});

const seloPix = css({
  display: "inline-flex",
  px: "2",
  py: "0.5",
  borderRadius: "pilula",
  bg: "alertaSuave",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
});

// position relative: torna a lista o bloco de contenção dos textos só para leitor de tela (srOnly,
// absolutos); sem isso eles escapavam do recorte e criavam um vão enorme de rolagem no painel.
const colunaCombina = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "3",
  flex: "1",
  minH: "0",
  mt: "2",
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollbarWidth: "thin",
});

const linkSugestao = css({
  display: "block",
  borderRadius: "xs",
  _hover: { "& span": { textDecoration: "underline" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
