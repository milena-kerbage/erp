"use client";

import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { Check, X } from "@/loja/componentes/icones";
import { Modal } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import { formatarPreco } from "@/loja/lib/casas/catalogo";
import type { Modulo, PecaCatalogo } from "@/loja/lib/casas/modulos";
import type { PecaParecida } from "./dadosMontador";

// "Ver peças parecidas" de um módulo do montador: diálogo central (Modal da base) com as peças do
// catálogo da mesma categoria, em grade de cards (foto 5:6, categoria, nome e "a partir de"). Cada
// card troca as opções do módulo pela peça ("Usar esta peça no meu quartinho") ou abre a página do
// produto ("Ver produto"; o rascunho do quartinho fica salvo neste navegador).
export function ModalParecidas({
  modulo,
  pecas,
  emUso,
  aoUsar,
  aoFechar,
}: {
  modulo: Modulo | null; // null = fechado
  pecas: PecaParecida[];
  emUso?: string; // slug da peça do catálogo que o módulo já usa
  aoUsar: (peca: PecaCatalogo | undefined) => void; // undefined = voltar às opções do ateliê
  aoFechar: () => void;
}) {
  return (
    <Modal aberta={modulo !== null} aoFechar={aoFechar} rotuloId="titulo-pecas-parecidas" classeCaixa={caixa}>
      <div className={css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "4" })}>
        <div className={css({ display: "grid", gap: "1", minW: "0" })}>
          <p className={css({ fontSize: "sm", color: "textoSuave" })}>
            Peças parecidas
          </p>
          <h2 id="titulo-pecas-parecidas" className={css({ fontSize: { base: "2xl", md: "subtitulo" }, fontWeight: "normal", letterSpacing: "bloco", color: "escuro" })}>
            {modulo?.nome}
          </h2>
          <p className={css({ maxW: "[60ch]", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
            Troque as opções do ateliê por uma peça do catálogo: o valor do módulo passa a ser o &quot;a partir de&quot; da peça, e a vendedora
            confirma tudo no WhatsApp.
          </p>
        </div>
        <button type="button" data-autofoco aria-label="Fechar peças parecidas" onClick={aoFechar} className={botaoFechar}>
          <X size={18} aria-hidden />
        </button>
      </div>

      <ul className={grade}>
        {pecas.map((peca) => {
          const usando = emUso === peca.slug;
          return (
            <li key={peca.slug} data-usando={usando || undefined} className={cartao}>
              <div className={css({ position: "relative" })}>
                <FotoProduto foto={peca.foto} sizes="(min-width: 768px) 260px, 45vw" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
                {usando && (
                  <span className={seloUso}>
                    <Check size={12} weight="bold" aria-hidden /> No seu quartinho
                  </span>
                )}
              </div>
              <div className={css({ display: "grid", gap: "1", mt: "3", flex: "1", alignContent: "start" })}>
                {peca.categoria && <p className={css({ fontSize: "xs", color: "textoSuave" })}>{peca.categoria}</p>}
                <h3 className={css({ fontSize: "sm", fontWeight: "medium", lineHeight: "texto", color: "escuro", textWrap: "pretty" })}>{peca.nome}</h3>
                <p className={css({ fontSize: "sm", color: "escuro" })}>
                  <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
                  {formatarPreco(peca.preco)}
                </p>
              </div>
              <div className={css({ display: "grid", gap: "2", mt: "4" })}>
                {usando ? (
                  <button type="button" onClick={() => aoUsar(undefined)} className={botao({ variante: "contorno", tamanho: "p", largo: true })}>
                    Voltar às opções do ateliê
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => aoUsar({ slug: peca.slug, nome: peca.nome, preco: peca.preco })}
                    className={cx(botao({ variante: "escuro", tamanho: "p", largo: true }), css({ h: "auto", minH: "10", py: "2", whiteSpace: "normal" }))}
                  >
                    Usar esta peça no meu quartinho
                  </button>
                )}
                <Link href={`/produto/${peca.slug}`} className={linkProduto}>
                  Ver produto
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

const caixa = css({
  w: "[min(960px, calc(100vw - 32px))]",
  borderRadius: "bloco",
  px: { base: "4", md: "8" },
  py: { base: "5", md: "8" },
});

const botaoFechar = css({
  flexShrink: "0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "full",
  bg: "superficieSuave",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "borda" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
  columnGap: { base: "3", md: "5" },
  rowGap: { base: "6", md: "8" },
  mt: { base: "5", md: "8" },
});

const cartao = css({
  display: "flex",
  flexDirection: "column",
  minW: "0",
  p: "2",
  borderWidth: "1px",
  borderColor: "transparent",
  transitionProperty: "border-color, background-color, transform",
  transitionDuration: "normal",
  transitionTimingFunction: "padrao",
  _hover: { borderColor: "borda", transform: "translateY(-2px)" },
  "&[data-usando]": { borderColor: "marca", bg: "marcaSuave" },
});

const seloUso = css({
  position: "absolute",
  top: "2",
  left: "2",
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  px: "2",
  py: "1",
  borderRadius: "pilula",
  bg: "marca",
  color: "superficie",
  fontSize: "xs",
  fontWeight: "medium",
  animation: "saltar",
});

const linkProduto = css({
  justifySelf: "center",
  fontSize: "sm",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[3px]",
  _hover: { textDecorationColor: "marca" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
