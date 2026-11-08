"use client";

import Link from "next/link";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { Baby, Check } from "@/loja/componentes/icones";
import { formatarPreco } from "@/loja/lib/casas/catalogo";
import { adicionarProjeto, useProjetosSelecionados } from "./estadoSelecao";

type Pacote = { readonly nome: string; readonly frase: string; readonly acrescimo: number; readonly itens: readonly string[] };

// Escolha do pacote do projeto (Essencial, Completo, Completo personalizado) com o preço "a partir
// de" de cada um (fictício). Compacto: nome, frase e quantos itens; os itens só abrem no pacote
// escolhido. "Adicionar à seleção" guarda projeto + pacote na seleção de projetos (separada do
// carrinho de produtos), de onde sai um pedido de orçamento com todos.
export function SeletorPacote({
  slug,
  nome,
  precoBase,
  pacotes,
}: {
  slug: string;
  nome: string;
  precoBase: number;
  pacotes: readonly Pacote[];
}) {
  const selecionados = useProjetosSelecionados() ?? [];
  const naLista = selecionados.find((projeto) => projeto.slug === slug);
  const [escolhido, setEscolhido] = useState(naLista?.pacote ?? pacotes[0].nome);
  const [abertos, setAbertos] = useState(false);
  const atual = pacotes.find((pacote) => pacote.nome === escolhido) ?? pacotes[0];
  const jaAdicionado = naLista?.pacote === escolhido;

  return (
    <div>
      <fieldset>
        <legend className={css({ mb: "2", fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>Escolha o pacote</legend>
        <div className={css({ display: "grid", gap: "2" })}>
          {pacotes.map((pacote) => (
            <label key={pacote.nome} className={opcao}>
              <input
                type="radio"
                name={`pacote-${slug}`}
                value={pacote.nome}
                checked={escolhido === pacote.nome}
                onChange={() => {
                  setEscolhido(pacote.nome);
                  setAbertos(false);
                }}
                className={css({ srOnly: true })}
              />
              <span className={css({ minW: "0" })}>
                <span className={css({ display: "block", fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>{pacote.nome}</span>
                <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>
                  {pacote.frase} · {pacote.itens.length} itens
                </span>
              </span>
              <span
                className={css({
                  flexShrink: "0",
                  fontSize: "sm",
                  fontWeight: "medium",
                  color: "escuro",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                })}
              >
                <span className={css({ display: "block", fontSize: "2xs", fontWeight: "normal", color: "textoSuave" })}>a partir de</span>
                {formatarPreco(precoBase + pacote.acrescimo)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" aria-expanded={abertos} onClick={() => setAbertos(!abertos)} className={verItens}>
        {abertos ? "Esconder os itens" : `Ver os ${atual.itens.length} itens do ${atual.nome}`}
      </button>
      {abertos && (
        <ul className={css({ mt: "2", display: "grid", gap: "1", fontSize: "xs", color: "texto" })}>
          {atual.itens.map((item) => (
            <li key={item} className={css({ display: "flex", gap: "1.5" })}>
              <Check size={14} aria-hidden className={css({ flexShrink: "0", mt: "0.5" })} />
              {item}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => adicionarProjeto({ slug, pacote: escolhido })}
        disabled={jaAdicionado}
        className={cx(botao({ variante: "escuro", tamanho: "g", largo: true }), css({ mt: "5" }))}
      >
        <Baby size={20} aria-hidden />
        {jaAdicionado ? "Na sua seleção" : naLista ? "Trocar o pacote na seleção" : "Adicionar à seleção"}
      </button>
      {naLista && (
        <p role="status" className={css({ mt: "3", fontSize: "sm", color: "texto", textAlign: "center" })}>
          {nome} ({naLista.pacote}) está na sua seleção.{" "}
          <Link href="/projetos/selecao" className={css({ fontWeight: "semibold", textDecoration: "underline", textUnderlineOffset: "3px" })}>
            Ver seleção e pedir orçamento
          </Link>
        </p>
      )}
    </div>
  );
}

const opcao = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  px: "4",
  py: "3",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  cursor: "pointer",
  transition: "colors",
  transitionDuration: "rapida",
  _hover: { borderColor: "textoSuave" },
  "&:has(input:checked)": { borderColor: "escuro", boxShadow: "[inset 0 0 0 1px token(colors.escuro)]" },
  "&:has(input:focus-visible)": { outline: "[2px solid token(colors.foco)]", outlineOffset: "[2px]" },
});

const verItens = css({
  mt: "2",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
});
