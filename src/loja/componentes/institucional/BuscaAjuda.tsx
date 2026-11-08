"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { css } from "styled-system/css";
import { ArrowRight, MagnifyingGlass, X } from "@/loja/componentes/icones";
import { buscarPerguntas, hrefPergunta, TEMAS_AJUDA } from "@/loja/lib/ajuda/conteudo";

// Busca simples da central de ajuda: filtra as perguntas no próprio navegador (sem servidor), sem
// acento e com todas as palavras. Cada resultado leva à resposta completa no tema (/ajuda/x#id).
export function BuscaAjuda() {
  const [termo, setTermo] = useState("");
  const adiado = useDeferredValue(termo);
  const resultados = buscarPerguntas(adiado);
  const id = useId();
  const temTermo = adiado.trim().length >= 2;
  const nomeTema = (slug: string) => TEMAS_AJUDA.find((tema) => tema.slug === slug)?.titulo ?? "";

  return (
    <div className={css({ maxW: "leitura" })}>
      <form role="search" onSubmit={(evento) => evento.preventDefault()}>
        <label htmlFor={`${id}-campo`} className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "escuro" })}>
          Busque sua dúvida
        </label>
        <div className={css({ position: "relative", mt: "2" })}>
          <MagnifyingGlass size={20} aria-hidden className={css({ position: "absolute", left: "4", top: "[50%]", transform: "translateY(-50%)", color: "textoSuave" })} />
          <input
            id={`${id}-campo`}
            type="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Ex.: frete, bordado, troca"
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby={`${id}-status`}
            className={campo}
          />
          {termo && (
            <button type="button" onClick={() => setTermo("")} aria-label="Limpar a busca" className={limpar}>
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </form>

      <p id={`${id}-status`} role="status" className={css({ mt: "3", fontSize: "sm", color: "textoSuave", minH: "5" })}>
        {temTermo
          ? resultados.length === 0
            ? "Nenhuma pergunta encontrada. Tente outra palavra ou fale com a gente pelo WhatsApp."
            : `${resultados.length} ${resultados.length === 1 ? "pergunta encontrada" : "perguntas encontradas"}`
          : ""}
      </p>

      {temTermo && resultados.length > 0 && (
        <ul className={css({ display: "grid", mt: "2", borderTopWidth: "1px", borderColor: "borda" })}>
          {resultados.slice(0, 8).map((pergunta) => (
            <li key={pergunta.id} className={css({ borderBottomWidth: "1px", borderColor: "borda" })}>
              <Link href={hrefPergunta(pergunta)} className={resultado}>
                <span className={css({ minW: "0" })}>
                  <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>{nomeTema(pergunta.tema)}</span>
                  <span className={css({ display: "block", mt: "1", fontSize: "md", fontWeight: "medium", color: "escuro" })}>{pergunta.pergunta}</span>
                  <span className={css({ display: "block", mt: "1", fontSize: "sm", lineHeight: "texto", color: "texto", lineClamp: "2" })}>
                    {pergunta.resposta}
                  </span>
                </span>
                <ArrowRight size={18} aria-hidden className={css({ flexShrink: "0", color: "escuro" })} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const campo = css({
  w: "full",
  h: "12",
  pl: "12",
  pr: "12",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "pilula",
  bg: "superficie",
  fontSize: "md",
  color: "escuro",
  _placeholder: { color: "textoSuave" },
  _hover: { borderColor: "textoSuave" },
  _focusVisible: { outline: "none", borderColor: "escuro", boxShadow: "anelFoco" },
  "&::-webkit-search-cancel-button": { display: "none" },
});

const limpar = css({
  position: "absolute",
  right: "2",
  top: "[50%]",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "8",
  h: "8",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const resultado = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  py: "4",
  _hover: { "& span span:nth-child(2)": { textDecoration: "underline", textUnderlineOffset: "[4px]" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});
