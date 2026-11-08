import Image from "next/image";
import { css } from "styled-system/css";
import { ATENDIMENTO } from "./conteudo";
import { Midia } from "./Midia";
import { QrCode } from "./QrCode";

// No lugar da promoção do app (lululemon-referencia.md §3.8), com as mesmas medidas:
// - seção de 100% × 100vh (mín. 600) com mídia de fundo em `cover`, escurecida pelo véu;
// - cartão de vidro em forma de celular com tamanho-base de 374×740 (231×458 no celular), centralizado
//   e escalado por transform para 72dvh de altura (68dvh no tablet, 54dvh no celular). Como na
//   referência, a escala vale para tudo dentro dele (título, QR, raio). A escala é a razão
//   altura-alvo / altura-base, calculada em CSS com tan(atan2(a, b)) = a / b;
// - raio de 36 (24 no celular), desfoque de 16 com saturação 1.5, fundo escuro a 40% e o "notch";
// - conteúdo em coluna com space-between e respiro de 56/24/32: símbolo da marca (24), título 40/48 e
//   texto 16 no meio e, embaixo, QR code de 140×140 (desktop e tablet) ou botão de 132×42 (celular).
// Estático: sem animação de rolagem. Server Component, zero JavaScript (o QR é gerado no servidor).
export function Atendimento() {
  const { titulo, texto, whatsapp, midia } = ATENDIMENTO;
  return (
    <section aria-labelledby="titulo-atendimento" className={secao}>
      <div className={css({ position: "absolute", inset: "0" })}>
        <Midia {...midia} apenasCor className={css({ w: "full", h: "full" })} />
      </div>
      <div aria-hidden className={veu} />

      <div className={cartao} data-cartao-atendimento>
        <span aria-hidden className={recorte} />
        <Image src="/vitrine/marca/simbolo-white.svg" alt="" width={21} height={24} className={css({ h: "6", w: "auto" })} />
        <div className={css({ display: "flex", flexDirection: "column", alignItems: "center", gap: "4" })}>
          <h2 id="titulo-atendimento" className={tituloCartao}>
            {titulo}
          </h2>
          <p className={textoCartao}>{texto}</p>
        </div>
        <a href={whatsapp.href} target="_blank" rel="noopener" aria-label={`${whatsapp.rotulo} (abre em nova aba)`} className={qr}>
          <QrCode valor={whatsapp.href} rotulo="QR code para conversar com o ateliê no WhatsApp" className={css({ w: "full", h: "full" })} />
        </a>
        <a href={whatsapp.href} target="_blank" rel="noopener" className={botao}>
          {whatsapp.rotulo}
        </a>
      </div>
    </section>
  );
}

// Módulo de mídia: sem margem própria (os vizinhos contidos mantêm a deles).
const secao = css({
  position: "relative",
  isolation: "isolate",
  w: "full",
  h: "[100vh]",
  minH: "[600px]",
  overflow: "hidden",
  bg: "aconchego.profundo",
});

const veu = css({ position: "absolute", inset: "0", bg: "veu" });

// `translate` e `scale` separados: se o navegador não calcular a escala, o cartão continua centrado.
const cartao = css({
  position: "absolute",
  top: "[50%]",
  left: "[50%]",
  w: { base: "[231px]", md: "[374px]" },
  h: { base: "[458px]", md: "[740px]" },
  translate: "[-50% -50%]",
  scale: "[var(--escala)]",
  "--escala": { base: "tan(atan2(54dvh, 458px))", md: "tan(atan2(68dvh, 740px))", desktop: "tan(atan2(72dvh, 740px))" },
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  pt: { base: "10", md: "14" },
  px: { base: "4", md: "6" },
  pb: { base: "6", md: "8" },
  borderRadius: { base: "3xl", md: "vidro" },
  bg: "vidroEscuro",
  backdropFilter: "auto",
  backdropBlur: "lg",
  backdropSaturate: "[1.5]",
  color: "superficie",
  textAlign: "center",
  overflow: "hidden",
});

// "Notch" do celular: pílula escura centralizada no alto (110×20 a 18 px do topo; proporcional no celular).
const recorte = css({
  position: "absolute",
  top: { base: "[11px]", md: "[18px]" },
  left: "[50%]",
  translate: "[-50% 0]",
  w: { base: "[68px]", md: "[110px]" },
  h: { base: "3", md: "5" },
  borderRadius: "pilula",
  bg: "recorteVidro",
});

const tituloCartao = css({
  fontFamily: "titulo",
  fontWeight: "normal",
  fontSize: { base: "subtitulo", md: "bloco" },
  lineHeight: "bloco",
  letterSpacing: "bloco",
  color: "superficie",
  textWrap: "balance",
});

const textoCartao = css({
  fontSize: { base: "sm", md: "md" },
  lineHeight: "texto",
  color: "textoVidro",
  textWrap: "balance",
});

// QR de 140×140 em quadrado branco (a zona de silêncio faz parte do desenho).
const qr = css({
  display: { base: "none", md: "block" },
  flexShrink: "0",
  w: "qrAtendimento",
  h: "qrAtendimento",
  borderRadius: "xs",
  overflow: "hidden",
  _focusVisible: { outline: "[2px solid]", outlineColor: "superficie", outlineOffset: "[4px]" },
});

// Botão de 132×42 do celular (no lugar do "Download" da referência): pílula clara, 14/500.
const botao = css({
  display: { base: "inline-flex", md: "none" },
  alignItems: "center",
  justifyContent: "center",
  w: "[132px]",
  h: "[42px]",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "none",
  whiteSpace: "nowrap",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
