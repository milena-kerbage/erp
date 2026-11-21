"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/Dialog";
import { navigation, type NavModule } from "@/config/navigation";
import { isPathActive } from "@/lib/navigation";

/**
 * Menu completo num painel lateral (abre pelo ícone de menu do header): todos os módulos com as seções de cada um,
 * os canais de atendimento com as conversas não lidas, os módulos ainda em produção (com o cadeado) e as
 * configurações. Enxuto de propósito: só os nomes. Clicar em qualquer opção leva à tela e fecha o painel.
 */
export function MenuLateral({ aberto, onClose, naoLidas }: { aberto: boolean; onClose: () => void; naoLidas: Record<string, number> }) {
  const pathname = usePathname();
  const liberados = navigation.main.filter((item) => !("soon" in item));
  const emProducao: readonly NavModule[] = navigation.main.filter((item) => "soon" in item);
  const canais = liberados.filter((item) => item.href in naoLidas);
  const principais = liberados.filter((item) => !(item.href in naoLidas));

  const linha = (modulo: NavModule, opcoes: { bloqueado?: boolean } = {}) => {
    const Icone = modulo.icon;
    const ativo = isPathActive(pathname, modulo.href);
    const pendentes = naoLidas[modulo.href] ?? 0;
    // Seções do módulo (as mesmas abas do topo da tela): a "Visão geral" entra sozinha quando o módulo tem.
    const secoes = opcoes.bloqueado ? [] : (modulo.tabs ?? []);
    return (
      <li key={modulo.href}>
        <Link href={modulo.href} className="modulo" data-ativo={ativo || undefined} data-bloqueado={opcoes.bloqueado || undefined} aria-current={ativo && pathname === modulo.href ? "page" : undefined} onClick={onClose}>
          <span className="icone"><Icone size={18} weight={ativo ? "fill" : "regular"} aria-hidden /></span>
          <strong>{modulo.label}</strong>
          {pendentes > 0 && <b aria-label={`${pendentes} não lidas`}>{pendentes > 99 ? "99+" : pendentes}</b>}
          {opcoes.bloqueado && <span className="selo" title="Em produção" aria-label="em produção"><LockSimpleIcon size={11} weight="fill" aria-hidden /></span>}
        </Link>
        {secoes.length > 0 && (
          <ul className="secoes">
            {secoes.map((secao) => {
              const naSecao = isPathActive(pathname, secao.href);
              return (
                <li key={secao.href}>
                  <Link href={secao.href} data-ativo={naSecao || undefined} aria-current={naSecao ? "page" : undefined} onClick={onClose}>{secao.label}</Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <Dialog open={aberto} onClose={onClose} side="left" title="Menu" width="16.5rem">
      <Lista aria-label="Menu completo">
        <h3>Principal</h3>
        <ul>{principais.map((modulo) => linha(modulo))}</ul>
        {canais.length > 0 && (
          <>
            <h3>Atendimento</h3>
            <ul>{canais.map((modulo) => linha(modulo))}</ul>
          </>
        )}
        <h3>Sistema</h3>
        <ul>{navigation.secondary.map((modulo) => linha(modulo))}</ul>
        {emProducao.length > 0 && (
          <>
            <h3>Em produção <span>{emProducao.length}</span></h3>
            <ul>{emProducao.map((modulo) => linha(modulo, { bloqueado: true }))}</ul>
          </>
        )}
      </Lista>
    </Dialog>
  );
}

const Lista = styled.nav`
  display: flex;
  flex-direction: column;
  padding-bottom: ${({ theme }) => theme.spacing(2)};

  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: ${({ theme }) => theme.spacing(4, 2, 1.5)};
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.text.muted};
  }
  h3:first-of-type { margin-top: 0; }
  h3 span { padding: 0 6px; border-radius: 999px; background: ${({ theme }) => theme.colors.interactive.pressed}; font-size: 0.625rem; line-height: 1rem; letter-spacing: 0; }

  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

  .modulo {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(3)};
    min-height: 2.25rem;
    padding: ${({ theme }) => theme.spacing(1, 2)};
    border-radius: ${({ theme }) => theme.radii.lg};
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: none;
    transition: background-color 0.2s ease;
  }
  .modulo:hover, .modulo:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .modulo[data-ativo] { background: ${({ theme }) => theme.colors.interactive.hover}; }
  .modulo:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: -2px; }

  .icone {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .modulo[data-ativo] .icone { background: ${({ theme }) => theme.colors.primary.main}; color: ${({ theme }) => theme.colors.primary.contrast}; }
  /* As logos dos canais já são coloridas: sem o quadradinho de fundo */
  .icone:has(svg[role="img"]) { background: transparent; }
  .modulo[data-ativo] .icone:has(svg[role="img"]) { background: transparent; }

  strong { flex: 1; min-width: 0; overflow: hidden; font-size: 0.875rem; font-weight: ${({ theme }) => theme.fontWeights.medium}; line-height: 1.3; white-space: nowrap; text-overflow: ellipsis; }
  .modulo[data-ativo] strong { font-weight: ${({ theme }) => theme.fontWeights.semibold}; }

  b {
    flex-shrink: 0;
    min-width: 1.25rem;
    padding: 0 6px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.danger};
    color: #fff;
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    line-height: 1.25rem;
    text-align: center;
  }

  /* Em produção: mais apagado, só com o cadeado */
  .modulo[data-bloqueado] strong { color: ${({ theme }) => theme.colors.text.secondary}; }
  .selo { flex-shrink: 0; display: grid; place-items: center; width: 1.25rem; height: 1.25rem; color: ${({ theme }) => theme.colors.text.muted}; }

  /* Seções do módulo: recuadas, com a linha de guia */
  .secoes {
    gap: 0;
    margin: 2px 0 ${({ theme }) => theme.spacing(1.5)} 1.375rem;
    padding-left: ${({ theme }) => theme.spacing(3)};
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
  .secoes a {
    display: block;
    padding: 5px ${({ theme }) => theme.spacing(2.5)};
    border-radius: ${({ theme }) => theme.radii.md};
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-decoration: none;
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  .secoes a:hover, .secoes a:focus-visible { background: ${({ theme }) => theme.colors.interactive.hover}; color: ${({ theme }) => theme.colors.text.primary}; }
  .secoes a[data-ativo] { color: ${({ theme }) => theme.colors.text.primary}; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
`;
