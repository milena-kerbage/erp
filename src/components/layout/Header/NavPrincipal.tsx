"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import { ListIcon, type Icon } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/Tooltip";
import { navigation, type NavModule } from "@/config/navigation";
import { isPathActive } from "@/lib/navigation";
import { useUnreadConversations } from "@/features/leads/store";
import { useInstagramUnread } from "@/features/whatsapp/unread";
import { MenuLateral } from "./MenuLateral";

type Canal = "whatsapp" | "instagram";

const CANAL: Record<string, Canal> = { "/conversas": "whatsapp", "/instagram": "instagram" };

/**
 * Canal ativo: um véu translúcido na cor do aplicativo, por cima do fundo do header. Translúcido (e não uma cor
 * clara fixa) para ficar suave tanto no tema claro quanto no escuro.
 */
const CORES_CANAL: Record<Canal, CSSProperties> = {
  whatsapp: { "--canal-bg": "rgb(37 211 102 / 0.1)" } as CSSProperties,
  instagram: { "--canal-bg": "linear-gradient(135deg, rgb(255 168 61 / 0.11) 0%, rgb(225 48 108 / 0.1) 55%, rgb(131 58 180 / 0.11) 100%)" } as CSSProperties,
};

const INICIO = new Set(["/", "/leads"]);

/**
 * Menu principal no centro do header (no lugar da antiga barra lateral): ícones agrupados — início, atendimento,
 * módulos e configurações —, com o nome em dica embaixo. O item da página atual mostra o nome ao lado do ícone, e os
 * canais mostram quantas conversas estão sem ler. O ícone de menu abre o painel lateral com tudo: os módulos e as
 * seções de cada um, os que ainda estão em produção e as configurações.
 */
export function NavPrincipal() {
  const pathname = usePathname();
  const naoLidas: Record<Canal, number> = { whatsapp: useUnreadConversations(), instagram: useInstagramUnread() };
  const [menuAberto, setMenuAberto] = useState(false);

  const liberados = navigation.main.filter((item) => !("soon" in item));
  const emProducao: readonly NavModule[] = navigation.main.filter((item) => "soon" in item);
  const item = (modulo: NavModule) => {
    const canal = CANAL[modulo.href];
    return <ItemMenu key={modulo.href} modulo={modulo} ativo={isPathActive(pathname, modulo.href)} canal={canal} naoLidas={canal ? naoLidas[canal] : 0} />;
  };

  const grupos: ReactNode[][] = [
    liberados.filter((modulo) => INICIO.has(modulo.href)).map(item),
    liberados.filter((modulo) => CANAL[modulo.href]).map(item),
    [
      ...liberados.filter((modulo) => !INICIO.has(modulo.href) && !CANAL[modulo.href]).map(item),
      <ItemMenu
        key="menu-completo"
        modulo={{ label: "Menu completo", href: "", icon: ListIcon }}
        ativo={emProducao.some((modulo) => isPathActive(pathname, modulo.href))}
        rotuloAtivo="Em produção"
        onClick={() => setMenuAberto(true)}
      />,
    ],
    navigation.secondary.map(item),
  ].filter((grupo) => grupo.some(Boolean));

  return (
    <Nav aria-label="Menu principal">
      {grupos.map((grupo, indice) => (
        <Fragment key={indice}>
          {indice > 0 && <Divisor aria-hidden />}
          {grupo}
        </Fragment>
      ))}
      <MenuLateral aberto={menuAberto} onClose={() => setMenuAberto(false)} naoLidas={{ "/conversas": naoLidas.whatsapp, "/instagram": naoLidas.instagram }} />
    </Nav>
  );
}

function ItemMenu({ modulo, ativo, canal, naoLidas = 0, rotuloAtivo, onClick }: { modulo: NavModule; ativo: boolean; canal?: Canal; naoLidas?: number; rotuloAtivo?: string; onClick?: () => void }) {
  const Icone: Icon = modulo.icon;
  const nome = naoLidas > 0 ? `${modulo.label}, ${naoLidas} ${naoLidas === 1 ? "conversa não lida" : "conversas não lidas"}` : modulo.label;
  const conteudo = (
    <>
      <span className="icone">
        <Icone size={canal ? 19 : 20} weight={ativo ? "fill" : "regular"} aria-hidden />
        {naoLidas > 0 && <Contador aria-hidden>{naoLidas > 99 ? "99+" : naoLidas}</Contador>}
      </span>
      {ativo && <span className="rotulo">{rotuloAtivo ?? modulo.label}</span>}
    </>
  );
  const props = {
    "data-ativo": ativo || undefined,
    "data-canal": canal,
    style: canal ? CORES_CANAL[canal] : undefined,
    "aria-label": nome,
  };
  return (
    <Tooltip label={naoLidas > 0 ? `${modulo.label} · ${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}` : modulo.label} side="bottom" disabled={ativo && !naoLidas}>
      {onClick ? (
        <Botao type="button" onClick={onClick} aria-haspopup="dialog" {...props}>{conteudo}</Botao>
      ) : (
        <Atalho href={modulo.href} aria-current={ativo ? "page" : undefined} {...props}>{conteudo}</Atalho>
      )}
    </Tooltip>
  );
}

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const Divisor = styled.span`
  flex-shrink: 0;
  width: 1px;
  height: 1.25rem;
  margin: 0 ${({ theme }) => theme.spacing(1.5)};
  background: ${({ theme }) => theme.colors.border.default};
`;

const estiloItem = ({ theme }: { theme: import("@emotion/react").Theme }) => `
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 2.25rem;
  min-width: 2.25rem;
  padding: 0;
  justify-content: center;
  border: 0;
  border-radius: ${theme.radii.lg};
  background: transparent;
  color: ${theme.colors.text.secondary};
  font: inherit;
  font-size: 0.8125rem;
  font-weight: ${theme.fontWeights.semibold};
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.25s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);

  .icone { position: relative; display: inline-flex; }
  .rotulo { animation: rotulo-entra 0.28s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
  @keyframes rotulo-entra { from { opacity: 0; transform: translateX(-4px); } }

  &:hover { background: ${theme.colors.interactive.hover}; color: ${theme.colors.text.primary}; }
  &:active { transform: scale(0.94); }
  &:focus-visible { outline: 2px solid ${theme.colors.primary.main}; outline-offset: 1px; }

  /* Página atual: um véu suave (sem sombra) com o nome ao lado do ícone. */
  &[data-ativo] {
    padding: 0 12px 0 10px;
    background: ${theme.colors.interactive.hover};
    color: ${theme.colors.text.primary};
  }
  &[data-ativo]:not([data-canal]) .icone { color: ${theme.colors.primary.main}; }

  /* Canais: as logos ficam coloridas; o ativo ganha o fundo clarinho na cor do aplicativo. */
  &[data-canal] { color: ${theme.colors.text.secondary}; }
  &[data-canal]:not([data-ativo]) .icone > svg { opacity: 0.85; filter: saturate(0.85); transition: opacity 0.15s ease, filter 0.15s ease; }
  &[data-canal]:not([data-ativo]):hover .icone > svg { opacity: 1; filter: none; }
  &[data-canal][data-ativo] { background: var(--canal-bg); }

  @media (prefers-reduced-motion: reduce) { transition: none; .rotulo { animation: none; } }
`;

const Atalho = styled(Link)`${estiloItem}`;
const Botao = styled.button`${estiloItem}`;

/** Quantas conversas estão sem ler, no canto do ícone do canal. */
const Contador = styled.b`
  position: absolute;
  top: -7px;
  left: calc(100% - 7px);
  min-width: 1.0625rem;
  height: 1.0625rem;
  padding: 0 4px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: 2px solid ${({ theme }) => theme.colors.background.canvas};
  background: ${({ theme }) => theme.colors.danger};
  color: #fff;
  font-size: 0.625rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-variant-numeric: tabular-nums;
  line-height: 0.8125rem;
  text-align: center;
  box-sizing: border-box;
  pointer-events: none;
  animation: contador-entra 0.25s cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes contador-entra { from { transform: scale(0.4); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
