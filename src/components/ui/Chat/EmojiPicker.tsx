"use client";

import { useEffect, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { GroupLabel, Surface } from "@/components/ui/Popover/styles";
import { usePopover, type PopoverTriggerProps } from "@/components/ui/Popover/usePopover";

/** Seleção enxuta, pensada para as conversas do ateliê. */
const EMOJIS = [
  "😊", "🥰", "😍", "🤩", "😉", "😂", "🥹", "🙏",
  "💚", "🤍", "💖", "✨", "🎉", "🥂", "💐", "🌸",
  "👰", "👗", "💍", "👠", "🧵", "🪡", "✂️", "📏",
  "📅", "⏰", "📍", "📸", "💬", "✅", "👍", "👏",
];

type EmojiPickerProps = {
  trigger: (props: PopoverTriggerProps & { open: boolean }) => ReactNode;
  onSelect: (emoji: string) => void;
  /** Posiciona junto a este elemento (ex.: a caixa de mensagem inteira). */
  anchorRef?: RefObject<HTMLElement | null>;
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 2rem);
  gap: 2px;
`;

const Emoji = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 1.125rem;
  line-height: 1;
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast};

  &:hover,
  &:focus-visible {
    background-color: ${({ theme }) => theme.colors.interactive.hover};
    transform: scale(1.12);
    outline: none;
  }
`;

/** Grade de emojis; escolher insere no texto e mantém o dropdown aberto. */
export function EmojiPicker({ trigger, onSelect, anchorRef }: EmojiPickerProps) {
  const popover = usePopover({ side: "top", align: "end", offset: 10, role: "dialog", anchorRef });
  const { open, position, contentRef, close } = popover;

  const ready = open && position !== null;
  useEffect(() => {
    if (ready) contentRef.current?.querySelector("button")?.focus();
  }, [ready, contentRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(contentRef.current?.querySelectorAll("button") ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const move = (delta: number) => {
      event.preventDefault();
      buttons[(index + delta + buttons.length) % buttons.length]?.focus();
    };

    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowDown") move(8);
    if (event.key === "ArrowUp") move(-8);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <>
      {trigger({ ...popover.triggerProps, open })}
      {open &&
        createPortal(
          <Surface
            ref={contentRef}
            id={popover.contentId}
            role="dialog"
            aria-label="Emojis"
            $side={position?.side ?? "top"}
            $width="auto"
            $ready={position !== null}
            style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
            onKeyDown={handleKeyDown}
          >
            <GroupLabel>Emojis</GroupLabel>
            <Grid>
              {EMOJIS.map((emoji) => (
                <Emoji key={emoji} type="button" aria-label={emoji} onClick={() => onSelect(emoji)}>
                  {emoji}
                </Emoji>
              ))}
            </Grid>
          </Surface>,
          document.body,
        )}
    </>
  );
}
