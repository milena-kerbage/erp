"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "@emotion/styled";
import {
  CodeIcon,
  KanbanIcon,
  PersonArmsSpreadIcon,
  PlugsConnectedIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import { isPathActive } from "@/lib/navigation";
import { transientOptions } from "@/lib/emotion/transient";

const groups: { label: string; items: { label: string; href: string; icon: Icon }[] }[] = [
  {
    label: "Ateliê",
    items: [
      { label: "Usuários", href: "/configuracoes/usuarios", icon: UsersThreeIcon },
      { label: "Funis e etapas", href: "/configuracoes/funis", icon: KanbanIcon },
      { label: "Preferências", href: "/configuracoes/preferencias", icon: SlidersHorizontalIcon },
    ],
  },
  {
    label: "Minha conta",
    items: [
      { label: "Perfil", href: "/configuracoes/perfil", icon: UserCircleIcon },
      { label: "Acessibilidade", href: "/configuracoes/acessibilidade", icon: PersonArmsSpreadIcon },
    ],
  },
  {
    label: "Conexões",
    items: [
      { label: "Integrações", href: "/configuracoes/integracoes", icon: PlugsConnectedIcon },
      { label: "API e webhooks", href: "/configuracoes/api", icon: CodeIcon },
    ],
  },
];

const Root = styled.div`
  display: grid;
  flex: 1 1 0;
  grid-template-columns: 15rem minmax(0, 1fr);
  min-height: 0;

  /* Celular: as seções viram pílulas no topo e o conteúdo ocupa o resto */
  ${({ theme }) => theme.media.md} {
    display: flex;
    flex-direction: column;
  }
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(5)};
  min-height: 0;
  padding: ${({ theme }) => theme.spacing(5, 3, 5, 4)};
  overflow-y: auto;
  border-right: 1px solid ${({ theme }) => theme.colors.border.faint};

  ${({ theme }) => theme.media.md} {
    flex-direction: row;
    flex-shrink: 0;
    gap: ${({ theme }) => theme.spacing(1.5)};
    padding: calc(${({ theme }) => theme.spacing(3)} + env(safe-area-inset-top)) ${({ theme }) => theme.spacing(4)}
      ${({ theme }) => theme.spacing(3)};
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.faint};
    scrollbar-width: none;
    overscroll-behavior-x: contain;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  ${({ theme }) => theme.media.md} {
    display: contents;
  }
`;

const GroupLabel = styled.span`
  padding: ${({ theme }) => theme.spacing(0, 2.5, 1.5)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.muted};

  ${({ theme }) => theme.media.md} {
    display: none;
  }
`;

/** Item ativo = "cartão" branco, como na sidebar expandida. */
const Item = styled(Link, transientOptions)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2.5)};
  height: 2.25rem;
  padding: ${({ theme }) => theme.spacing(0, 2.5)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.border.subtle : "transparent")};
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $active }) => ($active ? theme.palette.neutral[0] : "transparent")};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme, $active }) => ($active ? theme.fontWeights.medium : theme.fontWeights.regular)};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $active }) => ($active ? theme.palette.neutral[0] : theme.colors.interactive.hover)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  }

  ${({ theme }) => theme.media.md} {
    flex-shrink: 0;
    border-color: ${({ theme, $active }) => ($active ? theme.colors.border.default : theme.colors.border.subtle)};
    white-space: nowrap;
  }
`;

const Content = styled.div`
  min-height: 0;
  /* Folga entre a barra de rolagem e a borda do painel */
  margin-right: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;

  ${({ theme }) => theme.media.md} {
    flex: 1;
    margin-right: 0;
  }

  &::-webkit-scrollbar-track {
    margin-block: 10px;
  }
`;

/** Configurações: seções à esquerda (agrupadas) e o conteúdo da seção à direita. */
export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Root data-flush>
      <Nav
        aria-label="Seções das configurações"
        ref={(nav) => {
          const item = nav?.querySelector<HTMLElement>('[aria-current="page"]');
          if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return;
          nav.scrollLeft = item.offsetLeft - nav.clientWidth / 2 + item.offsetWidth / 2;
        }}
      >
        {groups.map((group) => (
          <Group key={group.label}>
            <GroupLabel>{group.label}</GroupLabel>
            {group.items.map((item) => {
              const active = isPathActive(pathname, item.href);
              return (
                <Item key={item.href} href={item.href} $active={active} aria-current={active ? "page" : undefined}>
                  <item.icon size={17} weight={active ? "fill" : "regular"} aria-hidden />
                  {item.label}
                </Item>
              );
            })}
          </Group>
        ))}
      </Nav>
      <Content>{children}</Content>
    </Root>
  );
}
