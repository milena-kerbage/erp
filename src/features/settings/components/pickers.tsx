"use client";

import { Fragment, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import type { Icon } from "@phosphor-icons/react";
import { GroupLabel, Surface } from "@/components/ui/Popover/styles";
import { usePopover, type PopoverTriggerProps } from "@/components/ui/Popover/usePopover";
import { transientOptions } from "@/lib/emotion/transient";
import type { Tone } from "@/styles/theme";
import { funnelIcons, funnelTones } from "@/features/leads/funnels";

const iconGroups = [...new Set(funnelIcons.map((option) => option.group))];

const toneNames: Record<Tone, string> = {
  neutral: "Cinza",
  blue: "Azul",
  lavender: "Lavanda",
  peach: "Pêssego",
  rose: "Rosa",
  green: "Verde",
  yellow: "Amarelo",
  teal: "Verde-água",
};

const Grid = styled("div", transientOptions)<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 2rem);
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(0.5, 1.5, 1.5)};
`;

/** Amostra de cor: quadrado no tom, com anel quando escolhida. */
const Swatch = styled("button", transientOptions)<{ $tone: Tone; $selected: boolean }>`
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $tone }) => theme.tones[$tone].soft};
  box-shadow: ${({ theme, $tone, $selected }) =>
    $selected
      ? `inset 0 0 0 2px ${theme.tones[$tone].fg}`
      : `inset 0 0 0 1px color-mix(in srgb, ${theme.tones[$tone].fg} 18%, transparent)`};
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: scale(1.08);
  }
`;

const IconChoice = styled("button", transientOptions)<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ theme, $selected }) => ($selected ? theme.colors.interactive.pressed : "transparent")};
  color: ${({ theme, $selected }) => ($selected ? theme.colors.text.primary : theme.colors.text.secondary)};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

type PickerProps = {
  label: string;
  tone: Tone;
  onToneChange: (tone: Tone) => void;
  /** Com ícone: escolhe também o ícone (funis). */
  icon?: Icon;
  onIconChange?: (icon: Icon) => void;
  trigger: (props: PopoverTriggerProps & { open: boolean }) => ReactNode;
};

/** Escolha de cor (e ícone, nos funis) num dropdown compacto. */
export function AppearancePicker({ label, tone, onToneChange, icon, onIconChange, trigger }: PickerProps) {
  const popover = usePopover({ side: "bottom", align: "start", offset: 6, role: "dialog" });
  const { open, position, contentRef } = popover;

  return (
    <>
      {trigger({ ...popover.triggerProps, open })}
      {open &&
        createPortal(
          <Surface
            ref={contentRef}
            id={popover.contentId}
            role="dialog"
            aria-label={label}
            $side={position?.side ?? "bottom"}
            $width="auto"
            $ready={position !== null}
            style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
            onKeyDown={(event) => event.key === "Escape" && popover.close(true)}
          >
            <GroupLabel>Cor</GroupLabel>
            <Grid $columns={8} role="radiogroup" aria-label="Cor">
              {funnelTones.map((option) => (
                <Swatch
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === tone}
                  aria-label={toneNames[option]}
                  title={toneNames[option]}
                  $tone={option}
                  $selected={option === tone}
                  onClick={() => onToneChange(option)}
                />
              ))}
            </Grid>
            {icon && onIconChange &&
              iconGroups.map((group) => (
              <Fragment key={group}>
                <GroupLabel>{group}</GroupLabel>
                <Grid $columns={7} role="radiogroup" aria-label={`Ícones: ${group}`}>
                  {funnelIcons.filter((option) => option.group === group).map((option) => (
                    <IconChoice
                      key={option.name}
                      type="button"
                      role="radio"
                      aria-checked={option.icon === icon}
                      aria-label={option.name}
                      title={option.name}
                      $selected={option.icon === icon}
                      onClick={() => onIconChange(option.icon)}
                    >
                      <option.icon size={18} />
                    </IconChoice>
                  ))}
                </Grid>
              </Fragment>
              ))}
          </Surface>,
          document.body,
        )}
    </>
  );
}
