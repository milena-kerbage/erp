"use client";

import { useRef, useState } from "react";
import { cx } from "styled-system/css";
import { Pause, Play } from "@/loja/componentes/icones";
import { controleEscuro } from "./estilos";

// Pausar/tocar os vídeos do módulo (botão escuro de 40 px, ícone 24). Age sobre os <video> dentro do
// elemento mais próximo marcado com data-midia-grupo. Só aparece em módulos que têm vídeo.
export function BotaoPausa({ className }: { className?: string }) {
  const botao = useRef<HTMLButtonElement>(null);
  const [pausado, setPausado] = useState(false);

  function alternar() {
    const grupo = botao.current?.closest("[data-midia-grupo]");
    for (const video of grupo?.querySelectorAll("video") ?? []) {
      if (pausado) void video.play();
      else video.pause();
    }
    setPausado(!pausado);
  }

  return (
    <button ref={botao} type="button" aria-label={pausado ? "Tocar vídeo" : "Pausar vídeo"} onClick={alternar} className={cx(controleEscuro, className)}>
      {pausado ? <Play size={24} weight="fill" aria-hidden /> : <Pause size={24} weight="fill" aria-hidden />}
    </button>
  );
}
