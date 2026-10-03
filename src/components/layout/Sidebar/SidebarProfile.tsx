"use client";

import type { ReactNode } from "react";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { CaretUpDownIcon, SignOutIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  Menu,
  MenuAddHint,
  MenuHeader,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { navigation } from "@/config/navigation";
import { transientOptions } from "@/lib/emotion/transient";
import { itemStyles } from "./styles";

type SidebarProfileProps = {
  name: string;
  email: string;
  role?: string;
  /** Base do avatar ilustrado quando não há foto. */
  seed?: string;
  avatarUrl?: string | null;
  expanded: boolean;
};

const Trigger = styled("button", transientOptions)<{ $open: boolean; $expanded: boolean }>`
  ${({ theme, $open, $expanded }) =>
    itemStyles({ theme, $active: $open && $expanded, $expanded, $tone: "surface" })};
  gap: ${({ theme }) => theme.spacing(2.5)};
  height: 2.75rem;
  /* Raio um pouco maior que os itens (é mais alto) e concêntrico com o avatar */
  border-radius: ${({ theme, $expanded }) => ($expanded ? theme.radii.lg : "50%")};
  padding: ${({ theme, $expanded }) => ($expanded ? theme.spacing(0, 2.5, 0, 1.25) : 0)};

  ${({ theme, $expanded, $open }) =>
    !$expanded &&
    css`
      background-color: transparent;
      border-color: transparent;

      &:hover {
        background-color: transparent;
        box-shadow: 0 0 0 3px ${theme.colors.interactive.pressed};
      }

      ${$open && `box-shadow: 0 0 0 3px ${theme.palette.sage[200]};`}
    `}
`;

/** O avatar acompanha o contêiner: círculo cheio recolhido, quadrado suave expandido. */
const AvatarBox = styled("span", transientOptions)<{ $expanded: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  width: ${({ $expanded }) => ($expanded ? "2rem" : "2.75rem")};
  height: ${({ $expanded }) => ($expanded ? "2rem" : "2.75rem")};
  margin: ${({ $expanded }) => ($expanded ? 0 : "-1px")};
  transition:
    width ${({ theme }) => theme.transitions.normal},
    height ${({ theme }) => theme.transitions.normal};

  > span {
    width: 100%;
    height: 100%;
  }
`;

const Info = styled("span", transientOptions)<{ $expanded: boolean }>`
  display: flex;
  flex: 1;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 0;
  opacity: ${({ $expanded }) => ($expanded ? 1 : 0)};
  transition: opacity ${({ theme }) => theme.transitions.fast};
  transition-delay: ${({ $expanded }) => ($expanded ? "80ms" : "0ms")};

  svg {
    flex-shrink: 0;
    margin-left: auto;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Texts = styled.span`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.span`
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Caption = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: ${({ theme }) => theme.lineHeights.tight};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const HeaderName = styled(Name)`
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const HeaderCaption = styled(Caption)`
  font-size: 0.8125rem;
`;

/** Complementos visuais de alguns itens do menu da conta. */
const trailing: Partial<Record<string, ReactNode>> = {
  "/configuracoes/usuarios": <MenuAddHint />,
};

const soonBadge = <Badge tone="peach">Produção</Badge>;

/** Usuário logado no rodapé da sidebar; abre o menu da conta. */
export function SidebarProfile({
  name,
  email,
  role,
  seed,
  avatarUrl,
  expanded,
}: SidebarProfileProps) {
  return (
    <Menu
      label="Menu da conta"
      side="top"
      align="start"
      offset={8}
      width={expanded ? "trigger" : "15rem"}
      trigger={(props) => (
        <Tooltip label="Minha conta" side="right" disabled={expanded || props["aria-expanded"]}>
          <Trigger
            type="button"
            $open={props["aria-expanded"]}
            $expanded={expanded}
            aria-label={`Minha conta: ${name}`}
            {...props}
          >
            <AvatarBox $expanded={expanded}>
              <Avatar
                name={name}
                seed={seed}
                src={avatarUrl}
                size={expanded ? "sm" : "lg"}
                shape={expanded ? "rounded" : "circle"}
              />
            </AvatarBox>
            <Info $expanded={expanded} aria-hidden>
              <Texts>
                <Name>{name}</Name>
                {role && <Caption>{role}</Caption>}
              </Texts>
              <CaretUpDownIcon size={16} />
            </Info>
          </Trigger>
        </Tooltip>
      )}
    >
      <MenuHeader>
        <Avatar name={name} seed={seed} src={avatarUrl} size="sm" shape="circle" ring />
        <Texts>
          <HeaderName>{name}</HeaderName>
          <HeaderCaption title={email}>{email}</HeaderCaption>
        </Texts>
      </MenuHeader>

      <MenuSeparator />

      {navigation.account.map((item) => (
        <MenuItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          trailing={"soon" in item ? soonBadge : trailing[item.href]}
          locked={"soon" in item}
        >
          {item.label}
        </MenuItem>
      ))}

      <MenuSeparator />

      {navigation.support.map((item) => (
        <MenuItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          trailing={"soon" in item ? soonBadge : undefined}
          locked={"soon" in item}
        >
          {item.label}
        </MenuItem>
      ))}

      <MenuSeparator />

      {/* TODO: encerrar a sessão quando a autenticação existir */}
      <MenuItem icon={SignOutIcon} muted>
        Sair
      </MenuItem>
    </Menu>
  );
}
