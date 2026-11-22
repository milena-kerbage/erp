"use client";

import Link from "next/link";
import { type CSSProperties, type FormEvent, useEffect, useId, useRef, useState } from "react";
import { cx } from "styled-system/css";
import { Dialogo } from "@/loja/componentes/carrinho/Dialogo";
import { botaoContorno, botaoEscuro, largo } from "@/loja/componentes/carrinho/estilos";
import { salvarPreferenciasCompra } from "@/loja/componentes/carrinho/estado";
import { Bag, CalendarCheck, Check, Copy, Tag } from "@/loja/componentes/icones";
import { mascararTelefone, NOME_DA_PECA, normalizarTelefoneVaral, PECAS, pecaValida, type Peca, type ResultadoVaral } from "@/loja/lib/varal/regras";
import { guardarResultadoVaral, useResultadoVaral, varalVencido } from "./guardado";
import { Brilho, Pregadores, Roupinha } from "./Roupinhas";
import estilos from "./varal.module.css";

// Varal de roupinhas: o minigame de um clique que entrega o cupom. A cliente informa o WhatsApp (com o aceite) e
// escolhe uma peça. Aí tudo acontece devagar, com suspense e sem cortes (cada fase começa na pose em que a anterior
// terminou): a peça cresce (foco), balança num pêndulo lento com estrelinhas em volta (suspense, enquanto o servidor
// sorteia), os pregadores abrem um a um e ela cai planando (queda), uma etiqueta fechada com "?" desce no lugar
// (mistério) e vira para mostrar o prêmio, com confetes. Só então abre a janela do cupom.
// O jogo é só a embalagem: o prêmio vem do servidor (POST /api/varal) e a peça não muda as chances.

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

/** Sorteio de enfeite (posição dos confetes), sempre igual: nada a ver com o prêmio, que vem do servidor. */
function enfeite(semente: number) {
  let valor = semente;
  return () => (valor = (valor * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
const PASTEIS = ["#FBDDE2", "#D9EAF6", "#FCF1C6", "#E9DFF7", "#DCEBD3", "#FFFFFF", "#F1DFC4"];
/** O estouro de trás da etiqueta: muitos confetes, em todas as direções, uns mais longe que outros. */
const CONFETES = (() => {
  const acaso = enfeite(11);
  return Array.from({ length: 44 }, (_, indice) => ({ cor: PASTEIS[indice % PASTEIS.length], ang: Math.round(acaso() * 360), dist: Math.round(70 + acaso() * 230), atraso: Math.round(acaso() * 260) }));
})();
/** A chuva de confete pela cena toda, caindo devagar depois do estouro. */
const CHUVA = (() => {
  const acaso = enfeite(29);
  return Array.from({ length: 64 }, (_, indice) => ({
    cor: PASTEIS[indice % PASTEIS.length], x: Math.round(acaso() * 100), tam: 6 + Math.round(acaso() * 6), prop: acaso() > 0.6 ? 1.8 : 1,
    dur: 3200 + Math.round(acaso() * 2600), atraso: 900 + Math.round(acaso() * 2200), deriva: Math.round((acaso() - 0.5) * 120), giro: Math.round((acaso() - 0.5) * 900),
  }));
})();

type Fase = "convite" | "escolha" | "foco" | "sorteando" | "caindo" | "misterio" | "etiqueta" | "fechado";

/** Quanto dura cada fase (ms). Batem com as animações de varal.module.css. */
const TEMPO = { foco: 1200, queda: 3600, misterio: 3900, virada: 1500, janela: 2800 };

const semAnimacao = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Varal() {
  const guardado = useResultadoVaral();
  const [fase, setFase] = useState<Fase>("convite");
  const [telefone, setTelefone] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [aviso, setAviso] = useState("");
  const [escolhida, setEscolhida] = useState<Peca | null>(null);
  const [resultado, setResultado] = useState<ResultadoVaral | null>(null);
  const [janela, setJanela] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [condicoes, setCondicoes] = useState("");
  const idTelefone = useId(), idErro = useId();
  const codigo = useRef<HTMLElement>(null);
  const instrucao = useRef<HTMLParagraphElement>(null);
  const temporizadores = useRef<number[]>([]);
  // O prêmio que o servidor já devolveu, esperando o pêndulo do suspense fechar o ciclo para entrar em cena.
  const pronto = useRef<ResultadoVaral | null>(null);

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
  const pecaDoPremio = premiado ? (escolhida ?? pecaValida(premiado.peca)) : null;
  const faseDaCena: Fase = anterior ? "etiqueta" : fase;

  const depois = (ms: number, acao: () => void) => { temporizadores.current.push(window.setTimeout(acao, ms)); };

  function comecar(evento: FormEvent) {
    evento.preventDefault();
    if (!normalizarTelefoneVaral(telefone)) { setErroForm("Confira o WhatsApp: informe o número com DDD."); return; }
    if (!aceite) { setErroForm("Para jogar, marque o aceite de comunicação."); return; }
    setErroForm(""); setAviso("");
    setFase("escolha");
    depois(60, () => instrucao.current?.focus());
  }

  /** Fim do suspense: a peça solta e cai, a etiqueta desce fechada, vira para o prêmio e só então a janela abre. */
  function revelar(premio: ResultadoVaral) {
    pronto.current = null;
    setResultado(premio);
    if (semAnimacao()) { setFase("etiqueta"); setJanela(true); return; }
    setFase("caindo");
    depois(TEMPO.queda, () => setFase("misterio"));
    depois(TEMPO.queda + TEMPO.misterio, () => setFase("etiqueta"));
    depois(TEMPO.queda + TEMPO.misterio + TEMPO.virada + TEMPO.janela, () => setJanela(true));
  }

  /** O pêndulo do suspense fechou um ciclo (a peça está no centro): se o prêmio já chegou, a queda começa daqui. */
  function cicloDoSuspense() {
    if (pronto.current && fase === "sorteando") revelar(pronto.current);
  }

  async function escolher(peca: Peca) {
    if (fase !== "escolha") return;
    setEscolhida(peca); setAviso("");
    const parado = semAnimacao();
    // Primeiro o foco (a peça cresce, as outras esmaecem); o pêndulo começa quando ela chega no lugar.
    setFase(parado ? "sorteando" : "foco");
    if (!parado) depois(TEMPO.foco, () => setFase((atual) => (atual === "foco" ? "sorteando" : atual)));
    try {
      const resposta = await fetch("/api/varal", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ telefone, peca, consentimento: aceite }) });
      const dados = (await resposta.json().catch(() => null)) as { resultado?: ResultadoVaral; erro?: { mensagem?: string } } | null;
      if (!resposta.ok || !dados?.resultado) throw new Error(dados?.erro?.mensagem || "Não foi possível concluir agora. Tente de novo em instantes.");
      const premio = dados.resultado;
      guardarResultadoVaral(premio);
      // O cupom já fica aplicado na sacola: a cliente não perde o desconto se fechar a janela.
      salvarPreferenciasCompra({ cupom: premio.codigo, semCupomAutomatico: undefined });
      if (parado) { revelar(premio); return; }
      // A revelação espera o pêndulo fechar o ciclo (cicloDoSuspense), para a queda sair da mesma pose, sem tranco.
      pronto.current = premio;
      // Rede de segurança: se a aba estiver em segundo plano e a animação não avisar, segue assim mesmo.
      depois(TEMPO.foco + 2 * 3400 + 600, () => { if (pronto.current) revelar(pronto.current); });
    } catch (falha) {
      pronto.current = null;
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
    : fase === "convite" ? "Deixe seu WhatsApp e escolha uma roupinha do varal para descobrir seu desconto."
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
          const estado = !dela ? undefined : anterior || faseDaCena === "etiqueta" ? "foi" : faseDaCena === "misterio" ? "misterio" : faseDaCena === "caindo" ? "caindo" : faseDaCena === "sorteando" ? "sorteando" : faseDaCena === "foco" ? "foco" : undefined;
          const sumiu = estado === "foi" || estado === "misterio";
          return (
            <div key={peca} className={estilos.lugar} data-escolhida={dela || undefined} data-estado={estado}
              style={{ "--x": lugar.x, "--y": lugar.y, "--dur": brisa.dur, "--atraso": brisa.atraso, "--giro": brisa.giro } as CSSProperties}>
              {dela && <span className={estilos.halo} aria-hidden />}
              <button type="button" className={estilos.peca} style={{ "--ordem": indice } as CSSProperties}
                aria-label={`Escolher ${NOME_DA_PECA[peca]}`} disabled={faseDaCena !== "escolha"} aria-hidden={sumiu || undefined} tabIndex={sumiu ? -1 : undefined}
                onClick={() => void escolher(peca)} onAnimationIteration={dela ? cicloDoSuspense : undefined}>
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
                  {CONFETES.map((confete, ordem) => <i key={ordem} style={{ "--cor": confete.cor, "--ang": `${confete.ang}deg`, "--dist": `${confete.dist}px`, "--atraso": `${confete.atraso}ms` } as CSSProperties} />)}
                </span>
              )}
              <span className={estilos.cartao}>
                <span className={estilos.face} data-lado="frente" aria-hidden><b>?</b></span>
                <span className={estilos.face} data-lado="verso">{premiado?.premio ?? " "}</span>
              </span>
            </div>
          );
        })()}
      </div>

      {/* A festa: quando a etiqueta vira nesta visita, chove confete pela cena toda */}
      {resultado && fase === "etiqueta" && (
        <span className={estilos.chuva} aria-hidden>
          {CHUVA.map((gota, ordem) => (
            <i key={ordem} style={{ "--cor": gota.cor, "--x": gota.x, "--tam": `${gota.tam}px`, "--prop": gota.prop, "--dur": `${gota.dur}ms`, "--atraso": `${gota.atraso}ms`, "--deriva": `${gota.deriva}px`, "--giro": `${gota.giro}deg` } as CSSProperties} />
          ))}
        </span>
      )}

      <div className={estilos.base}>
        <p role="status" aria-live="polite" className={estilos.regra}>
          {premiado && faseDaCena === "etiqueta" ? `Você ganhou ${premiado.premio}.` : fase === "foco" || fase === "sorteando" ? "Hum… o que será que tem nessa?" : fase === "caindo" ? "O pregador está soltando…" : fase === "misterio" ? "Tem uma etiqueta descendo…" : fase === "fechado" && !anterior ? "" : "Uma escolha por cliente."}
        </p>
        {aviso && <p role="alert" className={estilos.aviso}>{aviso}</p>}

        {!anterior && fase === "convite" && (
          <form className={estilos.convite} onSubmit={comecar} noValidate style={{ marginTop: 16 }}>
            <label htmlFor={idTelefone}>
              Seu WhatsApp
              <input id={idTelefone} type="tel" name="telefone" autoComplete="tel-national" inputMode="numeric" placeholder="(85) 99999-9999" maxLength={16} required value={telefone}
                aria-invalid={Boolean(erroForm) || undefined} aria-describedby={erroForm ? idErro : undefined} onChange={(evento) => { setTelefone(mascararTelefone(evento.target.value)); setErroForm(""); }} />
            </label>
            <label className={estilos.aceite}>
              <input type="checkbox" checked={aceite} onChange={(evento) => { setAceite(evento.target.checked); setErroForm(""); }} />
              <span>Aceito receber novidades e ofertas do Ateliê Milena Kerbage pelo WhatsApp. Posso cancelar quando quiser. Veja a <Link href="/politicas/privacidade">política de privacidade</Link>.</span>
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
            {/* A peça que ela escolheu, pendurada num pedacinho de varal */}
            <span className={estilos.lembranca} aria-hidden>
              <svg className={estilos.corda} viewBox="0 0 1000 26" preserveAspectRatio="none" focusable="false">
                <path className={estilos.fio} d="M0 4 Q500 24 1000 4" />
              </svg>
              <Brilho className={estilos.brilho} style={{ top: "30%", left: "24%", "--tam": "12px", "--dur": "3.2s" } as CSSProperties} />
              <Brilho className={estilos.brilho} data-tom="lilas" style={{ top: "58%", left: "72%", "--tam": "10px", "--dur": "4s", "--atraso": "0.8s" } as CSSProperties} />
              <span className={estilos.lugar}>
                <Roupinha peca={pecaValida(premiado.peca)} />
                <Pregadores peca={pecaValida(premiado.peca)} className={estilos.pregadores} />
              </span>
            </span>
            <p className={estilos.ganhou}>{premiado.jaJogou ? "Seu mimo continua valendo" : "Você ganhou"}</p>
            <p className={estilos.valor}>{premiado.premio}</p>
            <div className={estilos.pano}>
              <small>seu cupom</small>
              <code ref={codigo} className={estilos.codigo} aria-label={`Código do cupom: ${premiado.codigo}`}>{premiado.codigo}</code>
            </div>
            <dl className={estilos.detalhes}>
              <div>
                <dt><CalendarCheck size={14} aria-hidden /> Validade</dt>
                <dd>até {new Date(premiado.validoAte).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")}</dd>
              </div>
              <div>
                <dt><Tag size={14} aria-hidden /> Pedido mínimo</dt>
                <dd>{premiado.minimoCentavos > 0 ? `R$ ${(premiado.minimoCentavos / 100).toLocaleString("pt-BR", premiado.minimoCentavos % 100 ? { minimumFractionDigits: 2 } : undefined)}` : "Sem mínimo"}</dd>
              </div>
              <div>
                <dt><Bag size={14} aria-hidden /> Onde usar</dt>
                <dd>Já está na sua sacola</dd>
              </div>
            </dl>
            <p aria-live="polite" style={{ minHeight: "1.4em" }}>{copiado ? "Cupom copiado." : "Um cupom por pedido, enviado pelo WhatsApp."}</p>
          </div>
        )}
      </Dialogo>
    </section>
  );
}
