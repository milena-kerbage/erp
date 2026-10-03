"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Kbd } from "@/components/ui/SearchField/styles";
import { OPEN_SEARCH_EVENT, type OpenSearchDetail } from "../open";
import { CommandPalette } from "./CommandPalette";

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  flex: 0 1 17.5rem;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 10rem;
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5, 0, 3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: left;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  > span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  svg {
    flex-shrink: 0;
  }

  /* No celular a busca fica no dock de baixo (a paleta continua montada) */
  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Está digitando em algum campo (aí o "/" é texto, não atalho). */
function isTyping(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/** Campo de busca do topo: abre a busca completa (Ctrl+K, ⌘K ou "/" onde a página não tem busca). */
export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [isMac, setIsMac] = useState(false);

  // Outros pontos do app (dock e menu do celular) abrem a busca por evento
  useEffect(() => {
    const onOpen = (event: Event) => {
      setInitialQuery((event as CustomEvent<OpenSearchDetail>).detail?.query ?? "");
      setOpen(true);
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
  }, []);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));

    const onKeyDown = (event: KeyboardEvent) => {
      const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      // "/" abre a busca geral só onde a página não tem busca própria
      const slash =
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTyping(event.target) &&
        !document.querySelector("[data-page-search]");
      if (!combo && !slash) return;
      event.preventDefault();
      setInitialQuery("");
      setOpen((current) => (combo ? !current : true));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Trigger
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setInitialQuery("");
          setOpen(true);
        }}
      >
        <MagnifyingGlassIcon size={16} aria-hidden />
        <span>Buscar...</span>
        <Kbd aria-hidden>{isMac ? "⌘ K" : "Ctrl K"}</Kbd>
      </Trigger>
      <CommandPalette open={open} initialQuery={initialQuery} onClose={() => setOpen(false)} />
    </>
  );
}
