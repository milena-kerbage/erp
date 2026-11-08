"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef } from "react";
import { css } from "styled-system/css";
import { MagnifyingGlass, X } from "@/loja/componentes/icones";
import { montarUrlBusca, normalizarBusca } from "@/loja/lib/seo/urls";
import { Gaveta, useGaveta } from "./Gaveta";

// Busca em gaveta lateral (lululemon-referencia.md §1.6 e §2.5): o botão "Buscar" do cabeçalho
// abre uma gaveta de 440 px (tela cheia no celular) com o campo em pílula e os termos mais buscados.
// Nunca há campo aberto no próprio cabeçalho. Sem JavaScript, o botão é um link para /busca.
export function GavetaBusca({ termos }: { termos: string[] }) {
  const { aberta, abrir, fechar } = useGaveta();
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const termo = normalizarBusca(new FormData(evento.currentTarget).get("q")?.toString() ?? null);
    if (!termo) {
      campo.current?.focus();
      return;
    }
    fechar();
    router.push(montarUrlBusca(termo));
  }

  return (
    <>
      <a
        href="/busca"
        aria-haspopup="dialog"
        className={gatilho}
        onClick={(evento) => {
          evento.preventDefault();
          abrir();
        }}
      >
        <MagnifyingGlass aria-hidden className={css({ w: { base: "6", desktop: "4" }, h: { base: "6", desktop: "4" } })} />
        <span>Buscar</span>
      </a>

      <Gaveta aberta={aberta} aoFechar={fechar} rotulo="Buscar produtos" largura="busca" classePainel={painel}>
        <div className={topo}>
          <button type="button" data-autofoco aria-label="Fechar" onClick={fechar} className={fecharBotao}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <search>
          <form action="/busca" onSubmit={buscar} className={campoPilula}>
            <MagnifyingGlass size={16} aria-hidden className={css({ flexShrink: "0" })} />
            <input
              ref={campo}
              name="q"
              type="search"
              placeholder="Buscar"
              aria-label="Buscar produtos"
              autoComplete="off"
              enterKeyHint="search"
              className={entrada}
            />
          </form>
        </search>

        <div className={css({ py: "8" })}>
          <h2 className={tituloTermos}>Mais buscados</h2>
          <ul>
            {termos.map((termo) => (
              <li key={termo}>
                <Link href={montarUrlBusca(termo)} onClick={fechar} className={termoLink}>
                  <span>{termo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Gaveta>
    </>
  );
}

// "Buscar" do cabeçalho: ícone 16 + rótulo 14/500 no desktop (32 de altura, gap 6, padding 8);
// ícone 24 no celular (44 de altura, padding 10×12).
const gatilho = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  h: { base: "11", desktop: "8" },
  px: { base: "3", desktop: "2" },
  py: { base: "2.5", desktop: "2" },
  borderRadius: "pilula",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  cursor: "pointer",
  whiteSpace: "nowrap",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const painel = css({ gap: "6", px: { base: "3", md: "6" }, pb: { base: "5", md: "6" } });

// Cabeçalho de 72 px (32 em cima) com o fechar redondo de 40 à direita.
const topo = css({ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", h: "[72px]", pt: "8", flexShrink: "0" });

const fecharBotao = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  transition: "colors",
  transitionDuration: "normal",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Campo em pílula de 40 px, borda de 1 px, lupa de 16 e 8 de respiro.
const campoPilula = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  h: "10",
  px: "4",
  borderWidth: "1px",
  borderColor: "escuro",
  borderRadius: "pilula",
  color: "escuro",
  _focusWithin: { boxShadow: "anelFoco" },
});

const entrada = css({
  flex: "1",
  minW: "0",
  h: "full",
  bg: "transparent",
  fontSize: "md",
  fontWeight: "medium",
  color: "escuro",
  outline: "none",
  _placeholder: { color: "textoSuave" },
  "&::-webkit-search-cancel-button": { display: "none" },
});

const tituloTermos = css({ pb: "3", fontSize: { base: "xl", md: "2xl" }, fontWeight: "normal", lineHeight: "subtitulo", color: "escuro" });

// Termos de 16 px a ~38 px por linha; no hover o texto anda 5 px. Primeira letra maiúscula.
const termoLink = css({
  display: "block",
  py: "2",
  fontSize: "md",
  lineHeight: "texto",
  color: "escuro",
  "& > span": {
    display: "inline-block",
    transition: "transform",
    transitionDuration: "normal",
    transitionTimingFunction: "in-out",
  },
  "& > span::first-letter": { textTransform: "uppercase" },
  _hover: { "& > span": { transform: "translateX(5px)" } },
  _focusVisible: { outline: "none", "& > span": { textDecoration: "underline", textUnderlineOffset: "[4px]" } },
});
