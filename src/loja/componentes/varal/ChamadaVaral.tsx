"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { ArrowRight } from "@/loja/componentes/icones";
import type { Peca } from "@/loja/lib/varal/regras";
import { useResultadoVaral, varalVencido } from "./guardado";
import { Pregadores, Roupinha } from "./Roupinhas";
import estilos from "./varal.module.css";

// A chamada do varal espalhada pela loja (home e sacola): um varalzinho balançando que leva ao jogo. Quem já
// ganhou vê o próprio cupom no lugar do convite. Com o varal recolhido no ERP (e sem cupom guardado), ela não aparece.

/** As cinco peças ao longo da corda da faixa (a mesma curva do desenho: y = 6 + 80·t·(1 − t)). */
const MINI: { peca: Peca; x: number; y: number; dur: string; atraso: string }[] = (["body", "macacao", "vestido", "babador", "meinha"] as const).map((peca, indice) => {
  const x = 14 + indice * 18;
  return { peca, x, y: Math.round((6 + 80 * (x / 100) * (1 - x / 100)) * 10) / 10, dur: `${3.2 + (indice % 3) * 0.4}s`, atraso: `${-0.5 * indice}s` };
});

export function ChamadaVaral({ contexto = "inicio", className }: { contexto?: "inicio" | "sacola"; className?: string }) {
  const guardado = useResultadoVaral();
  const [ativo, setAtivo] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/varal", { headers: { Accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: { ativo?: boolean } | null) => { if (vivo) setAtivo(dados?.ativo === true); })
      .catch(() => { if (vivo) setAtivo(false); });
    return () => { vivo = false; };
  }, []);

  const meu = guardado && !varalVencido(guardado) ? guardado : null;
  // Na sacola, quem já tem o cupom não precisa da chamada: ele já está na lista de cupons.
  if (!meu && ativo !== true) return null;
  if (meu && contexto === "sacola") return null;

  return (
    <Link href="/varal" className={[estilos.raizChamada, estilos.chamada, className].filter(Boolean).join(" ")} aria-label={meu ? `Seu mimo do varal: ${meu.premio}. Ver o cupom ${meu.codigo}` : "Varal de roupinhas: escolha uma roupinha e ganhe um cupom de desconto"}>
      {/* O varal atravessa a faixa de ponta a ponta, preso num gancho de cada lado, como no jogo */}
      <span className={estilos.miniVaral} aria-hidden>
        <span className={estilos.gancho} data-lado="inicio" />
        <span className={estilos.gancho} data-lado="fim" />
        <svg className={estilos.corda} viewBox="0 0 1000 34" preserveAspectRatio="none" focusable="false">
          <path className={estilos.fio} d="M0 6 Q500 46 1000 6" />
          <path className={estilos.torcido} d="M0 6 Q500 46 1000 6" />
        </svg>
        {MINI.map((item) => (
          <span key={item.peca} className={estilos.lugar} style={{ "--x": item.x, "--y": item.y, "--dur": item.dur, "--atraso": item.atraso, "--giro": "3.5deg" } as CSSProperties}>
            <Roupinha peca={item.peca} />
            <Pregadores peca={item.peca} className={estilos.pregadores} />
          </span>
        ))}
      </span>
      <span className={estilos.conteudoChamada}>
      <span className={estilos.texto}>
        {meu ? (
          <>
            <strong>Seu mimo do varal: {meu.premio}</strong>
            <small>O cupom {meu.codigo} já está guardado para a sua sacola.</small>
          </>
        ) : contexto === "sacola" ? (
          <>
            <strong>Antes de fechar o pedido, escolha uma roupinha</strong>
            <small>Tem um cupom de desconto escondido no varal. É um clique.</small>
          </>
        ) : (
          <>
            <strong>Tem um mimo escondido no varal</strong>
            <small>Escolha uma roupinha e descubra o seu desconto para o enxoval.</small>
          </>
        )}
      </span>
        <span className={estilos.botaoChamada}>{meu ? "Ver meu cupom" : "Escolher roupinha"} <ArrowRight size={16} aria-hidden /></span>
      </span>
    </Link>
  );
}
