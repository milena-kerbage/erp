import Link from "next/link";
import { css, cx } from "styled-system/css";
import { BotaoPausa } from "@/loja/componentes/inicio/BotaoPausa";
import { botaoTerciario } from "@/loja/componentes/inicio/estilos";
import { Midia } from "@/loja/componentes/inicio/Midia";
import type { BlocoEditorial as Bloco } from "@/loja/lib/catalogo/edicoes";

const VIDEO = /\.(mp4|webm)$/i;

// Bloco editorial grande no meio da grade (a "Monthly Edit" da Lululemon, lululemon-animacoes-edicao.md
// §3): ocupa 2 colunas na altura de UM card (foto + textos), com a mídia em cover de borda a borda.
// A altura vem da linha da grade (o card ao lado); no celular, em largura total, a proporção é 4:5.
// Tipos: (a) texto sobreposto embaixo à esquerda com scrim; (b) só a foto de campanha; (c) clicável,
// com o CTA em pílula, o bloco inteiro é o link. Vídeo ganha o botão de pausa (40) no canto direito.
// Movimento (§1): parallax leve da mídia ligado à rolagem e zoom 1.01 → 1.1 no hover dos clicáveis;
// nada disso com prefers-reduced-motion.
export function BlocoEditorial({ bloco, prioridade = false }: { bloco: Bloco; prioridade?: boolean }) {
  const { titulo, subtitulo, href, acao, midia } = bloco;
  const temVideo = Boolean(midia.src && VIDEO.test(midia.src));
  const soImagem = !titulo;

  const texto = titulo ? (
    <span className={conteudo}>
      <span className={tituloBloco}>
        {titulo}
      </span>
      {subtitulo && <span className={subtituloBloco}>{subtitulo}</span>}
      {href && acao && <span className={cx(botaoTerciario, chamada)}>{acao}</span>}
    </span>
  ) : null;

  return (
    <div
      data-midia-grupo
      className={cx("group", moldura)}
      // Só imagem e sem foto real ainda: a composição é decorativa, então o bloco carrega a descrição.
      {...(soImagem && !midia.src ? { role: "img", "aria-label": midia.alt } : {})}
    >
      <div className={parallax}>
        <Midia
          src={midia.src}
          alt={soImagem ? midia.alt : ""}
          tom={midia.tom}
          icone={midia.icone}
          zoom={Boolean(href)}
          preload={prioridade}
          sizes="(min-width: 992px) 67vw, 100vw"
          className={css({ w: "full", h: "full" })}
        />
      </div>
      {titulo && <div aria-hidden className={scrimBloco} />}
      {href ? (
        <Link href={href} aria-label={titulo ? undefined : midia.alt} className={link}>
          {texto}
        </Link>
      ) : (
        texto
      )}
      {temVideo && (
        <div className={controles}>
          <BotaoPausa />
        </div>
      )}
    </div>
  );
}

// O bloco é um contêiner: o texto escala com a largura dele (na densidade "pequena" do celular ele tem
// ~250 px: só título e CTA). Linha do tempo de visualização para o parallax da mídia.
const moldura = css({
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  w: "full",
  h: { base: "auto", desktop: "full" },
  aspectRatio: { base: "[4 / 5]", md: "[4 / 3]", desktop: "auto" },
  minH: { desktop: "[320px]" },
  bg: "escuro",
  containerType: "inline-size",
  viewTimelineName: "--parallax-bloco",
  viewTimelineAxis: "block",
  // Densidade "pequena" (3 colunas no celular e no tablet): o bloco fica ao lado de 1 card, na altura dele.
  "[data-densidade=pequena] &": { h: "full", aspectRatio: "auto" },
});

// Mídia 16% mais alta que o bloco (8% para cima e para baixo), que desliza com a rolagem. Sem
// suporte a animation-timeline, fica parada (centrada).
const parallax = css({
  position: "absolute",
  insetInline: "0",
  top: "[-8%]",
  bottom: "[-8%]",
  "@supports (animation-timeline: view())": {
    _motionSafe: {
      animationName: "parallaxBloco",
      animationTimingFunction: "linear",
      animationFillMode: "both",
      animationTimeline: "--parallax-bloco",
      animationRange: "cover",
    },
  },
});

// Scrim escuro na base, só nos blocos com texto.
const scrimBloco = css({
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  bgImage: "[linear-gradient(to top, color-mix(in srgb, token(colors.escuro) 62%, transparent) 0%, color-mix(in srgb, token(colors.escuro) 24%, transparent) 38%, transparent 70%)]",
});

const link = css({
  position: "absolute",
  inset: "0",
  zIndex: "[1]",
  display: "flex",
  alignItems: "flex-end",
  color: "superficie",
  _focusVisible: { outline: "[2px solid token(colors.superficie)]", outlineOffset: "[-6px]" },
  "&:hover .chamada-bloco": { bg: "superficieSuave" },
});

// Texto no canto inferior esquerdo (padding 40 no desktop). Sem link, fica sobre a mídia sem capturar
// o clique (o botão de pausa continua acessível).
const conteudo = css({
  position: "absolute",
  insetInline: "0",
  bottom: "0",
  zIndex: "[1]",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: { base: "2", desktop: "3" },
  p: { base: "5", md: "8", desktop: "10" },
  pr: { base: "16", desktop: "20" }, // não passa por baixo do botão de pausa
  color: "superficie",
  "@container (max-width: 300px)": { p: "3", pr: "3", gap: "1" },
});

// Título 64/70.4 (−4%) no desktop, branco.
const tituloBloco = css({
  display: "block",
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "subtitulo", md: "secaoTablet", desktop: "secao" },
  lineHeight: { base: "bloco", md: "titulo" },
  letterSpacing: "titulo",
  textWrap: "balance",
  maxW: "[14ch]",
  "@container (max-width: 640px)": { fontSize: "subtitulo", lineHeight: "bloco" },
  "@container (max-width: 300px)": { fontSize: "xl", letterSpacing: "bloco" },
});

// Subtítulo 24–28.
const subtituloBloco = css({
  display: "block",
  fontSize: { base: "lg", md: "2xl", largo: "subtitulo" },
  lineHeight: "subtitulo",
  maxW: "[30ch]",
  textWrap: "pretty",
  "@container (max-width: 640px)": { fontSize: "md" },
  "@container (max-width: 300px)": { display: "none" },
});

const chamada = cx(
  "chamada-bloco",
  css({ mt: { base: "3", desktop: "5" }, "@container (max-width: 300px)": { mt: "1", minH: "9", px: "4" } }),
);

const controles = css({ position: "absolute", zIndex: "[2]", right: { base: "3", desktop: "10" }, bottom: { base: "3", desktop: "10" } });
