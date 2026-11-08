"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState, ViewTransition } from "react";

// Transição de página da loja: em toda navegação para outro caminho, o conteúdo antigo some em
// 180 ms e o novo entra subindo 8 px em 360 ms (fade, easing da assinatura cubic-bezier(.5,0,0,1)).
// Como funciona: o App Router navega dentro de uma Transition do React, e o <ViewTransition> com
// `key` = caminho faz o conteúdo antigo "sair" (exit → classe loja-sai) e o novo "entrar" (enter →
// loja-entra) num único document.startViewTransition(). O CSS das classes está no globalCss do
// panda.config.ts. Mudanças dentro da mesma página (filtros, ordem, paginação, "Ver mais") não
// trocam o caminho e não animam (update="none"). O cabeçalho (view-transition-name loja-cabecalho)
// e as gavetas abertas ficam parados por cima; faixa e rodapé (raiz) trocam sem cross-fade.
// Sem a API (navegadores antigos), a navegação é a normal e o conteúdo novo só entra com o fade
// (data-entrando + @supports no globalCss). Movimento reduzido: só um fade curto.
// Acessibilidade: a rolagem volta ao topo pelo próprio App Router; o foco vai para o título (h1) da
// página nova ou, sem título, para o conteúdo (depois que a gaveta aberta, se houver, fechar).
// Usado só nos layouts da loja (src/app/(site)/loja/**): o ERP não passa por aqui.
export function TransicaoPagina({ children }: { children: ReactNode }) {
  const caminho = usePathname();
  const [caminhoInicial] = useState(caminho);
  const conteudo = useRef<HTMLDivElement>(null);
  const anterior = useRef(caminho);

  useEffect(() => {
    if (anterior.current === caminho) return;
    anterior.current = caminho;
    const alvo = conteudo.current;
    if (!alvo) return;
    const focar = () => {
      if (!alvo.isConnected) return;
      const titulo = alvo.querySelector<HTMLElement>("h1");
      if (titulo && !titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
      (titulo ?? alvo).focus({ preventScroll: true });
    };
    // Com um <dialog> modal aberto o resto da página é inerte: o foco espera ele fechar.
    const dialogo = document.querySelector("dialog[open]");
    if (!dialogo) {
      focar();
      return;
    }
    dialogo.addEventListener("close", focar, { once: true });
    return () => dialogo.removeEventListener("close", focar);
  }, [caminho]);

  return (
    <ViewTransition key={caminho} enter="loja-entra" exit="loja-sai" update="none" share="none" default="none">
      <div ref={conteudo} tabIndex={-1} data-transicao-pagina="" data-entrando={caminho !== caminhoInicial ? "" : undefined}>
        {children}
      </div>
    </ViewTransition>
  );
}
