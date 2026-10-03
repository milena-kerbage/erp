"use client";

import { LockSimpleIcon, type Icon } from "@phosphor-icons/react";
import { useTheme } from "@emotion/react";
import { Badge } from "@/components/ui/Badge";
import { Indicator } from "@/components/ui/Indicator";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  IconBox,
  IndicatorSlot,
  ItemButton,
  ItemLink,
  Label,
  LockSlot,
  SoonSlot,
  type ItemTone,
} from "./styles";

type SidebarItemProps = {
  label: string;
  icon: Icon;
  expanded: boolean;
  /** Visual do círculo com a sidebar recolhida. */
  tone?: ItemTone;
  active?: boolean;
  indicator?: boolean;
  indicatorLabel?: string;
  /** Módulo em produção: selo "Produção" (expandida) ou cadeado (recolhida). */
  locked?: boolean;
  href?: string;
  onClick?: () => void;
};

/** Círculo com ícone quando a sidebar está recolhida; ícone + texto quando expandida. */
export function SidebarItem({
  label,
  icon: IconComponent,
  expanded,
  tone = "surface",
  active = false,
  indicator = false,
  indicatorLabel = "há novidades",
  locked = false,
  href,
  onClick,
}: SidebarItemProps) {
  const theme = useTheme();
  const styleProps = { $active: active, $expanded: expanded, $tone: tone };

  const ringColor =
    active && !expanded
      ? theme.colors.primary.main
      : !expanded && tone === "surface"
        ? theme.palette.neutral[0]
        : theme.colors.background.canvas;

  const content = (
    <>
      <IconBox $active={active} $expanded={expanded}>
        <IconComponent size={20} weight={active ? "fill" : "regular"} aria-hidden />
        {indicator && (
          <IndicatorSlot>
            <Indicator ringColor={ringColor} />
          </IndicatorSlot>
        )}
        {locked && !expanded && (
          <LockSlot aria-hidden>
            <LockSimpleIcon size={8} weight="fill" />
          </LockSlot>
        )}
      </IconBox>
      <Label $expanded={expanded} $active={active}>
        {label}
      </Label>
      {locked && (
        <SoonSlot $expanded={expanded} aria-hidden>
          <Badge tone="peach">Produção</Badge>
        </SoonSlot>
      )}
    </>
  );

  const accessibleName = indicator
    ? `${label}, ${indicatorLabel}`
    : locked
      ? `${label}, em produção`
      : undefined;

  const element = href ? (
    <ItemLink
      href={href}
      {...styleProps}
      aria-current={active ? "page" : undefined}
      aria-label={accessibleName}
      data-locked={locked || undefined}
    >
      {content}
    </ItemLink>
  ) : (
    <ItemButton
      type="button"
      {...styleProps}
      aria-label={accessibleName}
      data-locked={locked || undefined}
      onClick={onClick}
    >
      {content}
    </ItemButton>
  );

  return (
    <Tooltip label={locked ? `${label} (em produção)` : label} side="right" disabled={expanded}>
      {element}
    </Tooltip>
  );
}
