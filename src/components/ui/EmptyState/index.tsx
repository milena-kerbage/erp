"use client";

import type { ReactNode } from "react";
import { Actions, Description, IconWrap, Root, Title } from "./styles";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** Elemento do ícone (ex.: <PackageIcon size={28} />). */
  icon?: ReactNode;
  /** Botões de ação. */
  children?: ReactNode;
  className?: string;
};

/** Estado vazio: listas sem itens, buscas sem resultado, telas em construção. */
export function EmptyState({
  title,
  description,
  icon,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Root className={className}>
      {icon && <IconWrap aria-hidden>{icon}</IconWrap>}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {children && <Actions>{children}</Actions>}
    </Root>
  );
}
