"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { renderIcon, type IconSource } from "@/lib/icons";
import {
  IconSlot,
  Spinner,
  StyledButton,
  StyledLink,
  buttonSizes,
  type ButtonSize,
  type ButtonVariant,
} from "./styles";

export type { ButtonSize, ButtonVariant };

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone antes do texto. */
  icon?: IconSource;
  /** Ícone depois do texto. */
  iconEnd?: IconSource;
  loading?: boolean;
  fullWidth?: boolean;
};

type AsButton = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, "children"> & { href?: never };

type AsLink = BaseProps &
  Omit<ComponentPropsWithoutRef<"a">, "children" | "href"> & { href: string };

export type ButtonProps = AsButton | AsLink;

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  loading = false,
  fullWidth = false,
  ...rest
}: ButtonProps) {
  const iconSize = buttonSizes[size].icon;
  const styleProps = {
    $variant: variant,
    $size: size,
    $fullWidth: fullWidth,
    $iconStart: Boolean(icon) || loading,
    $iconEnd: Boolean(iconEnd),
  };

  const iconProps = { size: iconSize, weight: "regular" } as const;

  const content = (
    <>
      {loading ? (
        <Spinner aria-hidden $size={iconSize}>
          <CircleNotchIcon {...iconProps} />
        </Spinner>
      ) : (
        icon && (
          <IconSlot aria-hidden $size={iconSize} data-icon="start">
            {renderIcon(icon, iconProps)}
          </IconSlot>
        )
      )}
      <span data-button-label="">{children}</span>
      {iconEnd && (
        <IconSlot aria-hidden $size={iconSize} data-icon="end">
          {renderIcon(iconEnd, iconProps)}
        </IconSlot>
      )}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    return (
      <StyledLink {...(rest as AsLink)} {...styleProps}>
        {content}
      </StyledLink>
    );
  }

  const { disabled, ...buttonProps } = rest as AsButton;

  return (
    <StyledButton
      type="button"
      {...buttonProps}
      {...styleProps}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </StyledButton>
  );
}
