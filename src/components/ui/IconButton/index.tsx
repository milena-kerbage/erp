"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useTheme } from "@emotion/react";
import { Indicator } from "@/components/ui/Indicator";
import { Tooltip, type TooltipSide } from "@/components/ui/Tooltip";
import { renderIcon, type IconSource } from "@/lib/icons";
import {
  IconSlot,
  IndicatorSlot,
  StyledButton,
  StyledLink,
  sizes,
  type IconButtonSize,
  type IconButtonVariant,
} from "./styles";

export type { IconButtonSize, IconButtonVariant };

type BaseProps = {
  icon: IconSource;
  /** Nome acessível e texto do tooltip. Obrigatório: o botão só tem ícone. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Estado selecionado (ex.: página atual). */
  active?: boolean;
  /** Mostra o ponto de notificação. */
  indicator?: boolean;
  /** Complemento lido junto com o label quando `indicator` está ativo. */
  indicatorLabel?: string;
  tooltip?: TooltipSide | false;
};

type AsButton = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, "children"> & { href?: never };

type AsLink = BaseProps &
  Omit<ComponentPropsWithoutRef<"a">, "children" | "href"> & { href: string };

export type IconButtonProps = AsButton | AsLink;

export function IconButton({
  icon,
  label,
  variant = "secondary",
  size = "md",
  active = false,
  indicator = false,
  indicatorLabel = "há novidades",
  tooltip = "top",
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const accessibleName = indicator ? `${label}, ${indicatorLabel}` : label;
  const styleProps = { $variant: variant, $size: size, $active: active };

  const ringColor =
    variant === "primary"
      ? theme.colors.primary.main
      : variant === "ghost" && !active
        ? theme.colors.background.canvas
        : theme.palette.neutral[0];

  const content = (
    <>
      <IconSlot aria-hidden $size={sizes[size].icon}>
        {renderIcon(icon, { size: sizes[size].icon, weight: active ? "fill" : "regular" })}
      </IconSlot>
      {indicator && (
        <IndicatorSlot>
          <Indicator ringColor={ringColor} />
        </IndicatorSlot>
      )}
    </>
  );

  const element =
    "href" in rest && rest.href !== undefined ? (
      <StyledLink
        {...(rest as AsLink)}
        {...styleProps}
        aria-label={accessibleName}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </StyledLink>
    ) : (
      <StyledButton
        type="button"
        {...(rest as AsButton)}
        {...styleProps}
        aria-label={accessibleName}
      >
        {content}
      </StyledButton>
    );

  if (tooltip === false) return element;

  return (
    <Tooltip label={label} side={tooltip}>
      {element}
    </Tooltip>
  );
}
