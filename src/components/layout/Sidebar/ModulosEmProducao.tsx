"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { CheckIcon, HourglassMediumIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { NavModule } from "@/config/navigation";
import { SidebarItem } from "./SidebarItem";

/**
 * Os módulos ainda em produção ficam numa opção só do menu ("Em produção"); ao clicar, uma janela lista todos com o
 * que cada um vai trazer. Libere um módulo tirando o `soon` dele em src/config/navigation.ts.
 */
export function ModulosEmProducao({ modulos, expanded, ativo }: { modulos: readonly NavModule[]; expanded: boolean; ativo: boolean }) {
  const [aberto, setAberto] = useState(false);
  if (!modulos.length) return null;
  return (
    <>
      <SidebarItem label={`Em produção (${modulos.length})`} icon={HourglassMediumIcon} expanded={expanded} active={ativo} onClick={() => setAberto(true)} />
      <Dialog open={aberto} onClose={() => setAberto(false)} title="Módulos em produção" description="Estes módulos estão sendo preparados para o ateliê e serão liberados aos poucos." width="44rem">
        <Grade>
          {modulos.map((modulo) => {
            const Icone = modulo.icon;
            return (
              <li key={modulo.href}>
                <Link href={modulo.href} onClick={() => setAberto(false)}>
                  <span className="icone"><Icone size={20} aria-hidden /></span>
                  <span className="corpo">
                    <strong>{modulo.label}</strong>
                    {modulo.soon && <span className="descricao">{modulo.soon.description}</span>}
                    {modulo.soon?.features.length ? (
                      <ul className="recursos">{modulo.soon.features.map((recurso) => <li key={recurso}><CheckIcon size={12} weight="bold" aria-hidden />{recurso}</li>)}</ul>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </Grade>
      </Dialog>
    </>
  );
}

const Grade = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: ${({ theme }) => theme.spacing(2)};
  a {
    display: flex;
    gap: ${({ theme }) => theme.spacing(3)};
    height: 100%;
    padding: ${({ theme }) => theme.spacing(3)};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radii.md};
    color: inherit;
    text-decoration: none;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }
  a:hover, a:focus-visible { border-color: ${({ theme }) => theme.colors.primary.main}; background: ${({ theme }) => theme.colors.background.surface}; }
  .icone {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: ${({ theme }) => theme.radii.full};
    background: ${({ theme }) => theme.palette.neutral[100]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .corpo { display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing(1)}; min-width: 0; }
  strong { font-size: 0.9375rem; }
  .descricao { font-size: 0.8125rem; line-height: 1.5; color: ${({ theme }) => theme.colors.text.muted}; }
  .recursos { list-style: none; margin: ${({ theme }) => theme.spacing(1, 0, 0)}; padding: 0; display: flex; flex-direction: column; gap: 2px; font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.secondary}; }
  .recursos li { display: flex; align-items: center; gap: 6px; }
  .recursos svg { color: ${({ theme }) => theme.colors.primary.main}; flex-shrink: 0; }
`;
