"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Bubble, Trigger, type TooltipSide } from "./styles";

export type { TooltipSide };

type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  /** Atraso para abrir, em ms. */
  delay?: number;
  disabled?: boolean;
};

const GAP = 10;

function getPosition(rect: DOMRect, side: TooltipSide) {
  switch (side) {
    case "top":
      return { top: rect.top - GAP, left: rect.left + rect.width / 2 };
    case "bottom":
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 };
    case "left":
      return { top: rect.top + rect.height / 2, left: rect.left - GAP };
    case "right":
      return { top: rect.top + rect.height / 2, left: rect.right + GAP };
  }
}

/**
 * Rótulo visual para elementos (principalmente ícones). Renderiza em portal,
 * então não é cortado por containers com overflow.
 *
 * O elemento filho deve ter seu próprio nome acessível (ex.: aria-label);
 * o tooltip é apenas visual.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  delay = 300,
  disabled = false,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setPosition(null);
  }, []);

  const show = useCallback(
    (immediate = false) => {
      if (disabled) return;
      window.clearTimeout(timer.current);

      const open = () => {
        const target = triggerRef.current?.firstElementChild;
        if (!target) return;
        setPosition(getPosition(target.getBoundingClientRect(), side));
      };

      if (immediate) open();
      else timer.current = window.setTimeout(open, delay);
    },
    [delay, disabled, side],
  );

  const handleFocus = (event: FocusEvent) => {
    // Só abre no foco via teclado, não no clique.
    if (event.target instanceof Element && event.target.matches(":focus-visible")) {
      show(true);
    }
  };

  useEffect(() => {
    if (!position) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [position, hide]);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <Trigger
        ref={triggerRef}
        onPointerEnter={() => show()}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={handleFocus}
        onBlur={hide}
      >
        {children}
      </Trigger>

      {position &&
        createPortal(
          <Bubble
            aria-hidden
            $side={side}
            style={{ top: position.top, left: position.left }}
          >
            {label}
          </Bubble>,
          document.body,
        )}
    </>
  );
}
