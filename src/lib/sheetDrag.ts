"use client";

import { useEffect, useRef, type RefObject } from "react";
import { DOCK_EASE } from "./dock";
import { MOBILE_QUERY } from "./useMediaQuery";

/**
 * Folhas do celular (dropdowns, janelas, busca e menu): puxar para baixo fecha,
 * como no iOS (padrão do web-specular). O gesto vale na alça e em qualquer
 * parte que não rola; numa lista, só quando ela já está no topo.
 *
 * Enquanto o dedo está na folha, a página de trás nunca se mexe: o toque que
 * não é da lista (nem para o lado numa faixa que rola, como as pílulas) é
 * segurado aqui, então nem o "elástico" do iOS nem um arrasto lateral movem
 * a folha ou a tela.
 *
 * A folha segue o dedo por `translate` (e não `transform`), que não disputa
 * com a animação de entrada; a escrita é agrupada num quadro.
 */

/** Arrasto que fecha: um terço da folha, com teto (em folhas altas um terço seria demais). */
const CLOSE_DISTANCE = 120;
/** Peteleco para baixo (px/ms) fecha mesmo com pouco arrasto. */
const FLING = 0.55;
/** Movimento mínimo antes de decidir o que o gesto é. */
const SLOP = 6;

type Gesture = {
  x: number;
  y: number;
  target: EventTarget | null;
  scroller: HTMLElement | null;
  mode: "pending" | "drag" | "native" | "hold";
  dy: number;
  lastY: number;
  lastT: number;
  velocity: number;
  frame: number;
};

/** O que rola por baixo do dedo (dentro da folha) no eixo pedido, se houver. */
function scrollerOf(target: EventTarget | null, sheet: HTMLElement, axis: "x" | "y" = "y") {
  for (let element = target instanceof Element ? target : null; element; element = element.parentElement) {
    if (element instanceof HTMLElement) {
      const style = getComputedStyle(element);
      const overflow = axis === "y" ? style.overflowY : style.overflowX;
      const scrolls =
        axis === "y" ? element.scrollHeight > element.clientHeight + 1 : element.scrollWidth > element.clientWidth + 8; // sobra de poucos px (divisores) não conta
      if ((overflow === "auto" || overflow === "scroll") && scrolls) return element;
    }
    if (element === sheet) break;
  }
  return null;
}

export function useSheetDrag(ref: RefObject<HTMLElement | null>, onClose: () => void, active: boolean) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const sheet = ref.current;
    if (!active || !sheet) return;
    let gesture: Gesture | null = null;
    // Fechada pelo arrasto: a saída anima a partir de onde o dedo largou
    let dismissed = false;

    const reset = () => {
      sheet.style.transition = "";
      sheet.style.willChange = "";
      sheet.style.translate = "";
    };

    const onStart = (event: TouchEvent) => {
      gesture = null;
      if (event.touches.length !== 1 || !window.matchMedia(MOBILE_QUERY).matches) return;
      const touch = event.touches[0];
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        target: event.target,
        scroller: scrollerOf(event.target, sheet),
        mode: "pending",
        dy: 0,
        lastY: touch.clientY,
        lastT: event.timeStamp,
        velocity: 0,
        frame: 0,
      };
    };

    const onMove = (event: TouchEvent) => {
      const current = gesture;
      if (!current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - current.x;
      const dy = touch.clientY - current.y;

      if (current.mode === "pending") {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        const atTop = !current.scroller || current.scroller.scrollTop <= 0;
        // Para o lado só onde há algo que rola para o lado (ex.: pílulas); a folha em si nunca se mexe
        if (Math.abs(dx) > Math.abs(dy)) current.mode = scrollerOf(current.target, sheet, "x") ? "native" : "hold";
        else if (dy > 0 && atTop) {
          current.mode = "drag";
          sheet.style.transition = "none";
          sheet.style.willChange = "translate";
        } else current.mode = current.scroller ? "native" : "hold";
      }

      // A lista rola (ou a linha de pílulas corre para o lado) normalmente
      if (current.mode === "native") return;
      // O resto é da folha: a página de trás não se mexe
      if (event.cancelable) event.preventDefault();
      if (current.mode !== "drag") return;

      const elapsed = event.timeStamp - current.lastT;
      if (elapsed > 0) current.velocity = (touch.clientY - current.lastY) / elapsed;
      current.lastY = touch.clientY;
      current.lastT = event.timeStamp;
      current.dy = Math.max(0, dy);
      if (!current.frame)
        current.frame = requestAnimationFrame(() => {
          current.frame = 0;
          sheet.style.translate = `0 ${current.dy}px`;
        });
    };

    const onEnd = () => {
      const current = gesture;
      gesture = null;
      if (!current || current.mode !== "drag") return;
      if (current.frame) cancelAnimationFrame(current.frame);

      const distance = Math.min(sheet.offsetHeight / 3, CLOSE_DISTANCE);
      if (current.dy > distance || (current.velocity > FLING && current.dy > 24)) {
        // Fecha: a animação de saída desce a folha a partir daqui
        dismissed = true;
        closeRef.current();
        return;
      }
      if (current.dy === 0) {
        reset();
        return;
      }
      // Não passou: volta para o lugar
      sheet.style.transition = `translate 320ms ${DOCK_EASE}`;
      sheet.style.translate = "0 0";
      sheet.addEventListener("transitionend", reset, { once: true });
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
      if (gesture?.frame) cancelAnimationFrame(gesture.frame);
      if (!dismissed) reset();
    };
  }, [ref, active]);
}
