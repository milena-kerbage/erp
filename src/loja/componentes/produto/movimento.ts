import { css } from "styled-system/css";

// Entrada suave das seções da página de produto abaixo da dobra: a seção sobe 24 px e aparece nos
// primeiros 240 px de rolagem depois que o topo dela entra na tela (view(), ligado à rolagem: nada de
// JavaScript nem View Transitions). Sem suporte ou com movimento reduzido: a seção já está lá.
export const revelarAoRolar = css({
  _motionSafe: {
    "@supports (animation-timeline: view())": {
      animationName: "subirSecao",
      animationDuration: "[1ms]",
      animationTimingFunction: "[cubic-bezier(0.2, 0, 0, 1)]",
      animationFillMode: "both",
      animationTimeline: "view()",
      animationRange: "[entry 0% entry 240px]",
    },
  },
});
