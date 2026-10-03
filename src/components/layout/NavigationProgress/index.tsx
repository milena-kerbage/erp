"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styled from "@emotion/styled";
import { transientOptions } from "@/lib/emotion/transient";

type Phase = "idle" | "loading" | "done";

/** Avisa que uma navegação começou (para `router.push`, que não passa por um link). */
export function startNavigationProgress() {
  window.dispatchEvent(new Event("mk:navigation-start"));
}

const Bar = styled("div", transientOptions)<{ $phase: Phase }>`
  position: fixed;
  top: 0;
  left: 0;
  z-index: ${({ theme }) => theme.zIndex.toast};
  height: 2px;
  border-radius: 0 2px 2px 0;
  background-color: ${({ theme }) => theme.colors.primary.main};
  pointer-events: none;
  width: ${({ $phase }) => ($phase === "idle" ? "0" : $phase === "loading" ? "78%" : "100%")};
  opacity: ${({ $phase }) => ($phase === "done" ? 0 : 1)};
  transition: ${({ $phase }) =>
    $phase === "loading"
      ? "width 6s cubic-bezier(0.1, 0.6, 0.2, 1)"
      : $phase === "done"
        ? "width 200ms ease-out, opacity 300ms ease 200ms"
        : "none"};
`;

/**
 * Barra fina no topo enquanto a próxima tela carrega. Começa no clique em um
 * link interno (ou em `startNavigationProgress`) e termina quando a rota muda.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = () => {
      window.clearTimeout(timer.current);
      setPhase("idle");
      // Próximo frame, para a transição de largura partir do zero
      requestAnimationFrame(() => setPhase("loading"));
      // Segurança: se a rota não mudar (ex.: mesmo endereço), some sozinha
      timer.current = window.setTimeout(() => setPhase("done"), 8000);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("mk:navigation-start", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("mk:navigation-start", start);
    };
  }, []);

  // Rota mudou: completa e some.
  useEffect(() => {
    setPhase((current) => (current === "idle" ? current : "done"));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPhase("idle"), 600);
  }, [pathname, searchParams]);

  return <Bar $phase={phase} role="progressbar" aria-hidden={phase === "idle"} aria-label="Carregando a página" />;
}
