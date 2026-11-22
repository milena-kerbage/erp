"use client";

import Link from "next/link";
import { type CSSProperties, type FormEvent, useEffect, useId, useRef, useState } from "react";
import { cx } from "styled-system/css";
import { Dialogo } from "@/loja/componentes/carrinho/Dialogo";
import { botaoContorno, botaoEscuro, largo } from "@/loja/componentes/carrinho/estilos";
import { salvarPreferenciasCompra } from "@/loja/componentes/carrinho/estado";
import { Check, Copy } from "@/loja/componentes/icones";
import { NOME_DA_PECA, normalizarEmailVaral, PECAS, type Peca, type ResultadoVaral } from "@/loja/lib/varal/regras";
import { guardarResultadoVaral, useResultadoVaral, varalVencido } from "./guardado";
import { Brilho, Pregadores, Roupinha } from "./Roupinhas";
import estilos from "./varal.module.css";

// Varal de roupinhas: o minigame de um clique que entrega o cupom. A cliente informa o e-mail (com o aceite) e
// escolhe uma peça. Aí vem o suspense: a peça balança cada vez mais, com estrelinhas girando em volta; o pregador
// solta, ela rodopia e cai; uma etiqueta fechada (um "?") desce no lugar e vira para mostrar o prêmio, com confetes.
// Em seguida abre a janela do cupom. O jogo é só a embalagem: o prêmio vem do servidor (POST /api/varal) e a peça
// não muda as chances.

/**
 * Onde cada peça fica na corda: --x em % da largura e --y em px. A corda vai de uma ponta à outra do bloco e é mais
 * baixa no meio (a mesma curva do desenho: y = 8 + 208·t·(1 − t)).
 */
const alturaDaCorda = (x: number) => Math.round((8 + 208 * (x / 100) * (1 - x / 100)) * 10) / 10;
const LUGARES: { x: number; y: number }[] = [14, 32, 50, 68, 86].map((x) => ({ x, y: alturaDaCorda(x) }));
/** Cada peça balança num tempo e num ângulo diferentes, para não parecer mecânico. */
const BRISA = [
  { dur: "3.4s", atraso: "-0.6s", giro: "2.6deg" },
  { dur: "4.1s", atraso: "-2.1s", giro: "2deg" },
  { dur: "3.7s", atraso: "-1.2s", giro: "2.8deg" },
  { dur: "4.4s", atraso: "-3s", giro: "2.2deg" },
  { dur: "3.2s", atraso: "-0.2s", giro: "3deg" },
];
const BRILHOS: { top: string; left: string; tam: string; dur: string; atraso: string; tom?: string }[] = [
  { top: "9%", left: "7%", tam: "16px", dur: "3.8s", atraso: "0s" },
  { top: "22%", left: "92%", tam: "12px", dur: "4.6s", atraso: "1.1s", tom: "lilas" },
  { top: "44%", left: "3%", tam: "10px", dur: "5.2s", atraso: "2.2s", tom: "salvia" },
  { top: "6%", left: "70%", tam: "10px", dur: "4.2s", atraso: "0.7s" },
  { top: "70%", left: "95%", tam: "14px", dur: "3.6s", atraso: "1.8s" },
  { top: "82%", left: "12%", tam: "12px", dur: "4.9s", atraso: "2.9s", tom: "lilas" },
  { top: "58%", left: "50%", tam: "9px", dur: "5.6s", atraso: "3.4s", tom: "salvia" },
];

/** Confetes da revelação: o ângulo, a distância e a cor (tons pastel das roupinhas). */
const CONFETES = ["#FBDDE2", "#D9EAF6", "#FCF1C6", "#E9DFF7", "#DCEBD3", "#FFFFFF"].flatMap((cor, indice) => [
  { cor, ang: indice * 60 - 20, dist: 64 + (indice % 3) * 18 },
  { cor, ang: indice * 60 + 14, dist: 44 + ((indice + 1) % 3) * 16 },
]);

type Fase = "convite" | "escolha" | "sorteando" | "caindo" | "misterio" | "etiqueta" | "fechado";

const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Varal() {
  const guardado = useResultadoVaral();
  const [fase, setFase] = useState<Fase>("convite");
  const [email, setEmail] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aviso, setAviso] = useState("");
  const [escolhida, setEscolhida] = useState<Peca | null>(null);
  const [resultado, setResultado] = useState<ResultadoVaral | null>(null);
  const [janela, setJanela] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [condicoes, setCondicoes] = useState("");
  const idEmail = useId(), idErro = useId();
  const codigo = useRef<HTMLElement>(null);
  const instrucao = useRef<HTMLParagraphElement>(null);
  const temporizadores = useRef<number[]>([]);

  // O jogo está no ar? (e as condições do cupom, para o convite). Quem já jogou vê o cupom mesmo com o varal recolhido.
  useEffect(() => {
    let vivo = true;
    fetch("/api/varal", { headers: { Accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: { ativo?: boolean; condicoes?: string } | null) => {
        if (!vivo || !dados) return;
        if (typeof dados.condicoes === "string") setCondicoes(dados.condicoes);
        if (dados.ativo === false) setFase((atual) => (atual === "convite" ? "fechado" : atual));
      })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  useEffect(() => () => { for (const id of temporizadores.current) window.clearTimeout(id); }, []);

  // Quem já escolheu (neste aparelho): o varal aparece com a etiqueta no lugar da peça e o cupom à mão.
  // (Só vale antes de ela começar a jogar agora: durante a jogada, o prêmio só aparece no fim da animação.)
  const anterior = !resultado && !escolhida && guardado && !varalVencido(guardado) ? guardado : null;
  const premiado = resultado ?? anterior;
  const pecaDoPremio = premiado ? (escolhida ?? premiado.peca) : null;
  const faseDaCena: Fase = anterior ? "etiqueta" : fase;

  const depois = (ms: number, acao: () => void) => { temporizadores.current.push(window.setTimeout(acao, ms)); };

  function comecar(evento: FormEvent) {
    evento.preventDefault();
    if (!normalizarEmailVaral(email)) { setErroForm("Confira o e-mail: precisa ser um endereço válido."); return; }
    if (!aceite) { setErroForm("Para jogar, marque o aceite de comunicação."); return; }
    setErroForm(""); setAviso("");
    setFase("escolha");
    depois(60, () => instrucao.current?.focus());
  }

  async function escolher(peca: Peca) {
    if (fase !== "escolha") return;
    setEscolhida(peca); setFase("sorteando"); setAviso("");
    const inicio = Date.now();
    try {
      const resposta = await fetch("/api/varal", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, peca, consentimento: aceite }) });
      const dados = (await resposta.json().catch(() => null)) as { resultado?: ResultadoVaral; erro?: { mensagem?: string } } | null;
      if (!resposta.ok || !dados?.resultado) throw new Error(dados?.erro?.mensagem || "Não foi possível concluir agora. Tente de novo em instantes.");
      const premio = dados.resultado;
      guardarResultadoVaral(premio);
      // O cupom já fica aplicado na sacola: a cliente não perde o desconto se fechar a janela.
      salvarPreferenciasCompra({ cupom: premio.codigo, semCupomAutomatico: undefined });
      const revelar = () => {
        setResultado(premio);
        if (semAnimacao()) { setFase("etiqueta"); setJanela(true); return; }
        // A peça cai, a etiqueta desce fechada, vira para o prêmio e só então a janela abre.
        setFase("caindo");
        depois(1100, () => setFase("misterio"));
        depois(1100 + 1500, () => setFase("etiqueta"));
        depois(1100 + 1500 + 1700, () => setJanela(true));
      };
      // O suspense dura pelo menos um balanço inteiro, mesmo quando o servidor responde na hora.
      const espera = semAnimacao() ? 0 : Math.max(0, 1500 - (Date.now() - inicio));
      depois(espera, revelar);
    } catch (falha) {
      setEscolhida(null); setFase("escolha");
      setAviso(falha instanceof Error ? falha.message : "Não foi possível concluir agora. Tente de novo em instantes.");
    }
  }

  async function copiar() {
    if (!premiado) return;
    try {
      await navigator.clipboard.writeText(premiado.codigo);
      setCopiado(true);
    } catch {
      // Sem acesso à área de transferência: o código fica selecionado para copiar à mão.
      const alvo = codigo.current, selecao = window.getSelection();
      if (alvo && selecao) { const faixa = document.createRange(); faixa.selectNodeContents(alvo); selecao.removeAllRanges(); selecao.addRange(faixa); }
    }
  }

  const titulo = anterior ? "Seu mimo está guardado" : fase === "fechado" ? "O varal está recolhido" : "Ganhe um mimo para o enxoval";
  const texto = anterior
    ? `Você já escolheu sua roupinha. Seu cupom continua valendo: ${anterior.codigo}`
    : fase === "fechado" ? "As roupinhas voltam para o varal em breve. Enquanto isso, o enxoval continua esperando por você."
    : fase === "convite" ? "Deixe seu e-mail e escolha uma roupinha do varal para descobrir seu desconto."
    : "Escolha uma roupinha do varal para descobrir seu desconto.";

  return (
    <section className={estilos.raiz} aria-labelledby="titulo-varal">
      {BRILHOS.map((brilho, indice) => (
        <Brilho key={indice} className={estilos.brilho} data-tom={brilho.tom} style={{ top: brilho.top, left: brilho.left, "--tam": brilho.tam, "--dur": brilho.dur, "--atraso": brilho.atraso } as CSSProperties} />
      ))}

      <div className={estilos.topo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className={estilos.selo}><img src="/vitrine/marca/simbolo-green.svg" alt="" width={13} height={13} /> Varal de roupinhas</span>
        <h1 id="titulo-varal" className={estilos.titulo}>{titulo}</h1>
        <p ref={instrucao} tabIndex={-1} className={estilos.instrucao} style={{ outline: "none" }}>{texto}</p>
      </div>

      <div className={estilos.cena} data-fase={faseDaCena} data-escolhida={pecaDoPremio ?? escolhida ?? undefined}>
        <span className={estilos.gancho} data-lado="inicio" aria-hidden />
        <span className={estilos.gancho} data-lado="fim" aria-hidden />
        <svg className={estilos.corda} viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden focusable="false">
          <path className={estilos.fio} d="M0 8 Q500 112 1000 8" />
          <path className={estilos.torcido} d="M0 8 Q500 112 1000 8" />
        </svg>
        {PECAS.map((peca, indice) => {
          const lugar = LUGARES[indice], brisa = BRISA[indice];
          const dela = (pecaDoPremio ?? escolhida) === peca;
          const estado = !dela ? undefined : anterior || faseDaCena === "etiqueta" ? "foi" : faseDaCena === "misterio" ? "misterio" : faseDaCena === "caindo" ? "caindo" : faseDaCena === "sorteando" ? "sorteando" : undefined;
          const sumiu = estado === "foi" || estado === "misterio";
          return (
            <div key={peca} className={estilos.lugar} data-escolhida={dela || undefined} data-estado={estado}
              style={{ "--x": lugar.x, "--y": lugar.y, "--dur": brisa.dur, "--atraso": brisa.atraso, "--giro": brisa.giro } as CSSProperties}>
              {dela && <span className={estilos.halo} aria-hidden />}
              <button type="button" className={estilos.peca} style={{ "--ordem": indice } as CSSProperties}
                aria-label={`Escolher ${NOME_DA_PECA[peca]}`} disabled={faseDaCena !== "escolha"} aria-hidden={sumiu || undefined} tabIndex={sumiu ? -1 : undefined}
                onClick={() => void escolher(peca)}>
                <Roupinha peca={peca} />
              </button>
              <Pregadores peca={peca} className={estilos.pregadores} />
              {dela && (
                <span className={estilos.orbita} aria-hidden>
                  {[0, 60, 120, 180, 240, 300].map((angulo, ordem) => <Brilho key={angulo} style={{ "--ang": `${angulo}deg`, "--ordem": ordem } as CSSProperties} />)}
                </span>
              )}
            </div>
          );
        })}
        {pecaDoPremio && (faseDaCena === "misterio" || (premiado && faseDaCena === "etiqueta")) && (() => {
          const indice = PECAS.indexOf(pecaDoPremio), lugar = LUGARES[indice], virada = faseDaCena === "etiqueta";
          return (
            <div className={estilos.etiqueta} data-borda={indice === 0 ? "inicio" : indice === PECAS.length - 1 ? "fim" : undefined} data-virada={virada || undefined} data-quieta={anterior ? true : undefined}
              style={{ "--x": lugar.x, "--y": lugar.y } as CSSProperties}>
              {virada && !anterior && (
                <span className={estilos.estouro} aria-hidden>
                  {CONFETES.map((confete, ordem) => <i key={ordem} style={{ "--cor": confete.cor, "--ang": `${confete.ang}deg`, "--dist": `${confete.dist}px` } as CSSProperties} />)}
                </span>
              )}
              <span className={estilos.cartao}>
                <span className={estilos.face} data-lado="frente" aria-hidden>?</span>
                <span className={estilos.face} data-lado="verso">{premiado?.premio ?? " "}</span>
              </span>
            </div>
          );
        })()}
      </div>

      <div className={estilos.base}>
        <p role="status" aria-live="polite" className={estilos.regra}>
          {premiado && faseDaCena === "etiqueta" ? `Você ganhou ${premiado.premio}.` : fase === "sorteando" ? "Hum… o que será que tem nessa?" : fase === "caindo" ? "Soltou o pregador!" : fase === "misterio" ? "Tem uma etiqueta descendo…" : fase === "fechado" && !anterior ? "" : "Uma escolha por cliente."}
        </p>
        {aviso && <p role="alert" className={estilos.aviso}>{aviso}</p>}

        {!anterior && fase === "convite" && (
          <form className={estilos.convite} onSubmit={comecar} noValidate style={{ marginTop: 16 }}>
            <label htmlFor={idEmail}>
              Seu e-mail
              <input id={idEmail} type="email" name="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" required value={email}
                aria-invalid={Boolean(erroForm) || undefined} aria-describedby={erroForm ? idErro : undefined} onChange={(evento) => { setEmail(evento.target.value); setErroForm(""); }} />
            </label>
            <label className={estilos.aceite}>
              <input type="checkbox" checked={aceite} onChange={(evento) => { setAceite(evento.target.checked); setErroForm(""); }} />
              <span>Aceito receber novidades e ofertas do Ateliê Milena Kerbage por e-mail. Posso cancelar quando quiser. Veja a <Link href="/politicas/privacidade">política de privacidade</Link>.</span>
            </label>
            {erroForm && <p id={idErro} role="alert" className={estilos.erro}>{erroForm}</p>}
            <button type="submit" className={cx(botaoEscuro, largo)}>Quero escolher minha roupinha</button>
            {condicoes && <p className={estilos.regra}>{condicoes} Um cupom por cliente.</p>}
          </form>
        )}

        {premiado && faseDaCena === "etiqueta" && (
          <div style={{ display: "grid", gap: 10, marginTop: 16, gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
            <button type="button" className={botaoEscuro} onClick={() => { setCopiado(false); setJanela(true); }}>Ver meu cupom</button>
            <Link href="/" className={botaoContorno}>Ver as peças</Link>
          </div>
        )}
      </div>

      <Dialogo aberto={janela && Boolean(premiado)} aoFechar={() => setJanela(false)} titulo="Seu mimo do varal"
        rodape={<div className={estilos.acoes}>
          <button type="button" className={botaoEscuro} onClick={() => void copiar()}>
            {copiado ? <><Check size={18} aria-hidden /> Cupom copiado</> : <><Copy size={18} aria-hidden /> Copiar cupom</>}
          </button>
          <button type="button" className={botaoContorno} onClick={() => setJanela(false)}>Fechar</button>
        </div>}>
        {premiado && (
          <div className={estilos.premio}>
            <p className={estilos.ganhou}>{premiado.jaJogou ? "Seu cupom continua valendo" : "Você ganhou"}</p>
            <p className={estilos.valor}>{premiado.premio}</p>
            <code ref={codigo} className={estilos.codigo} aria-label={`Código do cupom: ${premiado.codigo}`}>{premiado.codigo}</code>
            <p>{premiado.condicoes}</p>
            <p>Já deixamos o cupom aplicado na sua sacola. O desconto entra no pedido que você envia pelo WhatsApp.</p>
            <p aria-live="polite" style={{ minHeight: "1.4em" }}>{copiado ? "Cupom copiado." : ""}</p>
          </div>
        )}
      </Dialogo>
    </section>
  );
}
