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

const MINI: { peca: Peca; x: number; y: number; dur: string; atraso: string }[] = [
  { peca: "body", x: 18, y: 8, dur: "3.2s", atraso: "-0.4s" },
  { peca: "vestido", x: 50, y: 13, dur: "3.9s", atraso: "-1.6s" },
  { peca: "meinha", x: 82, y: 8, dur: "3.5s", atraso: "-2.4s" },
];

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
      <span className={estilos.miniVaral} aria-hidden>
        <svg className={estilos.corda} viewBox="0 0 1000 26" preserveAspectRatio="none" focusable="false">
          <path className={estilos.fio} d="M0 4 Q500 24 1000 4" />
        </svg>
        {MINI.map((item) => (
          <span key={item.peca} className={estilos.lugar} style={{ "--x": item.x, "--y": item.y, "--dur": item.dur, "--atraso": item.atraso, "--giro": "4deg" } as CSSProperties}>
            <Roupinha peca={item.peca} />
            <Pregadores peca={item.peca} className={estilos.pregadores} />
          </span>
        ))}
      </span>
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
    </Link>
  );
}
