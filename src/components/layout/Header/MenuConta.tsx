"use client";

import { logout } from "@/lib/auth/client";
import type { ReactNode } from "react";
import styled from "@emotion/styled";
import { SignOutIcon } from "@phosphor-icons/react";
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

type MenuContaProps = {
  name: string;
  email: string;
  role?: string;
  /** Base do avatar ilustrado quando não há foto. */
  seed?: string;
  avatarUrl?: string | null;
};

/** Avatar redondo no canto direito do header; um anel aparece no hover e com o menu aberto. */
const Trigger = styled("button", transientOptions)<{ $open: boolean }>`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.transitions.fast}, transform 0.15s ease;
  box-shadow: ${({ theme, $open }) => ($open ? `0 0 0 3px ${theme.palette.sage[200]}` : "none")};

  &:hover {
    box-shadow: 0 0 0 3px ${({ theme, $open }) => ($open ? theme.palette.sage[200] : theme.colors.interactive.pressed)};
  }
  &:active { transform: scale(0.96); }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: 2px; }

  > span { width: 100%; height: 100%; }
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

/** Pessoa logada no canto direito do header; abre o menu da conta. */
export function MenuConta({ name, email, role, seed, avatarUrl }: MenuContaProps) {
  return (
    <Menu
      label="Menu da conta"
      side="bottom"
      align="end"
      offset={8}
      width="16rem"
      trigger={(props) => (
        <Tooltip label="Minha conta" side="bottom" disabled={props["aria-expanded"]}>
          <Trigger type="button" $open={props["aria-expanded"]} aria-label={`Minha conta: ${name}`} {...props}>
            <Avatar name={name} seed={seed} src={avatarUrl} size="md" shape="circle" />
          </Trigger>
        </Tooltip>
      )}
    >
      <MenuHeader>
        <Avatar name={name} seed={seed} src={avatarUrl} size="sm" shape="circle" ring />
        <Texts>
          <HeaderName>{name}</HeaderName>
          {role && <HeaderCaption>{role}</HeaderCaption>}
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
      <MenuItem icon={SignOutIcon} muted onSelect={() => void logout()}>
        Sair
      </MenuItem>
    </Menu>
  );
}
