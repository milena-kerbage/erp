"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { CaretLeftIcon, CaretRightIcon, DownloadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/IconButton";

export type LightboxImage = { url: string; name: string };

type LightboxProps = {
  images: readonly LightboxImage[];
  /** Índice aberto; `null` fecha. */
  index: number | null;
  onClose: () => void;
};

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const zoom = keyframes`
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: none; }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(16, 20)};
  background-color: rgba(18, 20, 17, 0.82);
  backdrop-filter: blur(6px);
  animation: ${fade} 160ms ease-out;
`;

const Image = styled.img`
  max-width: 100%;
  max-height: 100%;
  border-radius: ${({ theme }) => theme.radii.xl};
  object-fit: contain;
  animation: ${zoom} 200ms cubic-bezier(0.16, 1, 0.3, 1);
`;

const Toolbar = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing(4)};
  right: ${({ theme }) => theme.spacing(4)};
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const Caption = styled.span`
  position: absolute;
  bottom: ${({ theme }) => theme.spacing(5)};
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8125rem;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
`;

/** Posição na galeria em badge (ex.: 2/5). */
const Counter = styled.span`
  padding: ${({ theme }) => theme.spacing(0.5, 2)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: rgba(255, 255, 255, 0.14);
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.palette.neutral[0]};
`;

const Nav = styled.div<{ side: "left" | "right" }>`
  position: absolute;
  top: 50%;
  ${({ side }) => side}: ${({ theme }) => theme.spacing(5)};
  transform: translateY(-50%);
`;

/** Visualizador de imagens em tela cheia (Esc fecha, setas navegam). */
export function Lightbox({ images, index, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(index ?? 0);
  const closeRef = useRef<HTMLDivElement>(null);
  const open = index !== null;

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.querySelector("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setCurrent((value) => (value + 1) % images.length);
      if (event.key === "ArrowLeft") setCurrent((value) => (value - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, images.length, onClose]);

  if (!open) return null;
  const image = images[current];
  if (!image) return null;

  return createPortal(
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-label={image.name}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <Image key={image.url} src={image.url} alt={image.name} />

      <Toolbar ref={closeRef}>
        <IconButton href={image.url} download={image.name} icon={DownloadSimpleIcon} label="Baixar" tooltip="bottom" />
        <IconButton icon={XIcon} label="Fechar" tooltip="bottom" onClick={onClose} />
      </Toolbar>

      {images.length > 1 && (
        <>
          <Nav side="left">
            <IconButton
              icon={CaretLeftIcon}
              label="Anterior"
              onClick={() => setCurrent((value) => (value - 1 + images.length) % images.length)}
            />
          </Nav>
          <Nav side="right">
            <IconButton
              icon={CaretRightIcon}
              label="Próxima"
              onClick={() => setCurrent((value) => (value + 1) % images.length)}
            />
          </Nav>
        </>
      )}

      <Caption>
        {image.name}
        {images.length > 1 && (
          <Counter>
            {current + 1}/{images.length}
          </Counter>
        )}
      </Caption>
    </Backdrop>,
    document.body,
  );
}
