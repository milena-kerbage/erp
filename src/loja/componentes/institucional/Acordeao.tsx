"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { CaretDown } from "@/loja/componentes/icones";

export type ItemAcordeao = { id: string; pergunta: string; resposta: string; link?: { rotulo: string; href: string } };

// Perguntas em acordeão, no mesmo movimento das colunas do rodapé no celular (ColunaRodape): linha
// com divisória, ícone que gira e altura animada (grid-template-rows 0fr → 1fr, 300 ms). Fechada, a
// resposta fica `visibility: hidden` (fora do Tab e do leitor de tela) depois da animação.
// Cada item tem âncora (#id): um link da busca da central (/ajuda/x#id) abre a pergunta certa.
export function Acordeao({ itens, nivel = 3 }: { itens: ItemAcordeao[]; nivel?: 2 | 3 }) {
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    function abrirPelaAncora() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !itens.some((item) => item.id === id)) return;
      setAbertos((atuais) => new Set(atuais).add(id));
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    }
    abrirPelaAncora();
    window.addEventListener("hashchange", abrirPelaAncora);
    return () => window.removeEventListener("hashchange", abrirPelaAncora);
  }, [itens]);

  function alternar(id: string) {
    setAbertos((atuais) => {
      const novos = new Set(atuais);
      if (novos.has(id)) novos.delete(id);
      else novos.add(id);
      return novos;
    });
  }

  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <div className={css({ borderTopWidth: "1px", borderColor: "borda" })}>
      {itens.map((item) => {
        const aberto = abertos.has(item.id);
        return (
          <div key={item.id} id={item.id} data-aberto={aberto || undefined} className={linha}>
            <Titulo className={css({ fontSize: "inherit", fontWeight: "inherit" })}>
              <button
                type="button"
                id={`${item.id}-botao`}
                aria-expanded={aberto}
                aria-controls={`${item.id}-resposta`}
                onClick={() => alternar(item.id)}
                className={gatilho}
              >
                <span>{item.pergunta}</span>
                <CaretDown size={18} aria-hidden className={icone} />
              </button>
            </Titulo>
            <div id={`${item.id}-resposta`} role="region" aria-labelledby={`${item.id}-botao`} className={painel}>
              <div className={painelInterno}>
                <div className={css({ pb: "6", pr: { md: "10" }, maxW: "leitura" })}>
                  <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>{item.resposta}</p>
                  {item.link && (
                    <Link href={item.link.href} className={linkResposta}>
                      {item.link.rotulo}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const linha = css({ borderBottomWidth: "1px", borderColor: "borda", scrollMarginTop: "[96px]" });

const gatilho = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  w: "full",
  minH: "16",
  py: "4",
  fontSize: { base: "md", md: "lg" },
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
  _focusVisible: { outline: "none", boxShadow: "anelFoco", borderRadius: "xs" },
});

const icone = css({
  flexShrink: "0",
  transition: "transform",
  transitionDuration: "acordeao",
  transitionTimingFunction: "assinatura",
  "[data-aberto] &": { transform: "rotate(180deg)" },
});

const painel = css({
  display: "grid",
  gridTemplateRows: "[0fr]",
  transitionProperty: "grid-template-rows",
  transitionDuration: "acordeao",
  transitionTimingFunction: "assinatura",
  "[data-aberto] > &": { gridTemplateRows: "[1fr]" },
});

const painelInterno = css({
  minH: "0",
  overflow: "hidden",
  visibility: "hidden",
  transitionProperty: "visibility",
  transitionDuration: "[0s]",
  transitionDelay: "acordeao",
  "[data-aberto] &": { visibility: "visible", transitionDelay: "[0s]" },
});

const linkResposta = css({
  display: "inline-block",
  mt: "3",
  fontSize: "sm",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  _hover: { textDecorationColor: "marca" },
});
