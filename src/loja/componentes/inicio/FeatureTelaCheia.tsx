import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Plus } from "@/loja/componentes/icones";
import { BotaoPausa } from "./BotaoPausa";
import type { Feature } from "./conteudo";
import { botaoTerciario, controleClaro, scrim } from "./estilos";
import { Midia } from "./Midia";

const VIDEO = /\.(mp4|webm)$/i;

// Feature em tela cheia (lululemon-referencia.md §3.6): 100vh de mídia cover com o scrim do hero e
// uma frase curta. "esquerda": embaixo à esquerda (0 96 40 40); "centro": centralizada (0 40 128) com
// 2 botões. Título 64 (28 no celular) e 40 até os botões (32 no celular). Sem margem própria.
// A mídia anda com a rolagem (parallax por view-timeline, lululemon-animacoes-edicao.md §1); sem
// suporte, fica estática.
export function FeatureTelaCheia({ feature }: { feature: Feature }) {
  const idTitulo = `titulo-${feature.id}`;
  const temVideo = Boolean(feature.midia.src && VIDEO.test(feature.midia.src));
  return (
    <section aria-labelledby={idTitulo} data-midia-grupo className={secao}>
      <div className={css({ position: "absolute", inset: "0" })}>
        <Midia {...feature.midia} iconeNoAlto parallax className={css({ w: "full", h: "full" })} />
      </div>
      <div className={scrim} />
      <div className={cx(conteudo, feature.centro ? centro : esquerda)}>
        <h2 id={idTitulo} className={cx(titulo, feature.centro && css({ mx: "auto" }))}>
          {feature.titulo}
        </h2>
        <div className={cx(css({ display: "flex", flexWrap: "wrap", gap: "4" }), feature.centro && css({ justifyContent: "center" }))}>
          {feature.acoes.map((acao) => (
            <Link
              key={acao.href}
              href={acao.href}
              className={botaoTerciario}
              {...(acao.externo ? { target: "_blank", rel: "noopener" } : {})}
            >
              {acao.rotulo}
            </Link>
          ))}
        </div>
      </div>
      <div className={controles}>
        {feature.atalho && (
          <Link href={feature.atalho.href} aria-label={feature.atalho.rotulo} className={controleClaro}>
            <Plus size={24} weight="light" aria-hidden />
          </Link>
        )}
        {temVideo && <BotaoPausa />}
      </div>
    </section>
  );
}

const secao = css({
  position: "relative",
  isolation: "isolate",
  display: "flex",
  alignItems: "flex-end",
  h: "[100svh]",
  // clip (não hidden): não vira contêiner de rolagem, e a view-timeline do parallax segue a página.
  overflow: "clip",
  bg: "escuro",
});

const conteudo = css({
  position: "relative",
  zIndex: "[1]",
  display: "flex",
  flexDirection: "column",
  gap: { base: "8", desktop: "10" },
  w: "full",
});

const esquerda = css({ pl: { base: "3", md: "5", desktop: "10" }, pr: { base: "3", md: "5", desktop: "24" }, pb: { base: "20", desktop: "10" } });
const centro = css({ alignItems: "center", textAlign: "center", px: { base: "3", md: "5", desktop: "10" }, pb: { base: "20", desktop: "32" } });

// Título 64/70.4 (28/33.6 no celular), entreletra −4%, branco, quebra equilibrada.
const titulo = css({
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "subtitulo", md: "secaoTablet", desktop: "secao" },
  lineHeight: { base: "bloco", md: "titulo" },
  letterSpacing: "titulo",
  color: "superficie",
  textWrap: "balance",
  maxW: "[725px]",
});

const controles = css({
  position: "absolute",
  zIndex: "[2]",
  right: { base: "3", desktop: "10" },
  bottom: { base: "3", desktop: "10" },
  display: "flex",
  gap: "2",
});
