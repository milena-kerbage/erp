import Image from "next/image";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Needle } from "@/loja/componentes/icones";
import type { EstiloPropaganda, Propaganda } from "@/loja/lib/catalogo/propagandas";

// Card de campanha no meio da grade (Lululemon): foto inteira e o card todo clicável. A foto é
// decorativa (alt vazio): título, texto e CTA já dizem para onde o link leva.
// 3 estilos sorteados: escuro (degradê e texto branco embaixo), claro (bloco branco embaixo) e
// topo (degradê e texto branco em cima). Sem foto (ainda não há fotos das campanhas): bloco sálvia
// com uma agulha de bordado decorativa ao fundo; o estilo "claro" vira sálvia suave com texto escuro.
export function CardPropaganda({ propaganda, estilo }: { propaganda: Propaganda; estilo: EstiloPropaganda }) {
  const { titulo, texto, acao, href, imagem } = propaganda;
  const externo = href.startsWith("http");
  return (
    <Link
      href={href}
      className={cx("group", card, imagem ? VARIANTES[estilo] : SEM_FOTO[estilo])}
      {...(externo ? { target: "_blank", rel: "noopener" } : {})}
    >
      {imagem ? (
        <Image
          src={imagem.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className={foto}
          style={imagem.posicao ? { objectPosition: imagem.posicao } : undefined}
        />
      ) : (
        <Needle aria-hidden weight="thin" className={enfeite} />
      )}
      <span className={cx(conteudo, imagem && estilo === "claro" && blocoClaro, !imagem && css({ textShadow: "none" }))}>
        <span className={css({ display: "block", fontSize: { base: "3xl", xl: "4xl" }, lineHeight: "[1.2]", letterSpacing: "[-0.02em]" })}>
          {titulo}
        </span>
        <span className={css({ display: "block", mt: "2", fontSize: { base: "md", xl: "lg" }, lineHeight: "snug", maxW: "[30ch]" })}>
          {texto}
        </span>
        <span className={chamada}>
          {acao}
          {externo && <span className={css({ srOnly: true })}> (abre em nova aba)</span>}
        </span>
      </span>
    </Link>
  );
}

const card = css({
  position: "relative",
  isolation: "isolate",
  display: "flex",
  h: "full",
  minH: { base: "[min(133vw, 640px)]", md: "[520px]" }, // celular: 3:4, a mesma proporção da foto
  overflow: "hidden",
  _focusVisible: { outline: "[2px solid token(colors.foco)]", outlineOffset: "[-4px]" },
  // Degradê atrás do texto, para ler sobre qualquer foto.
  _before: { content: '""', position: "absolute", inset: "0", zIndex: "[1]", pointerEvents: "none" },
});

const foto = css({
  objectFit: "cover",
  transition: "transform",
  transitionDuration: "lenta",
  transitionTimingFunction: "padrao",
  _groupHover: { transform: "scale(1.03)" },
  _motionReduce: { transitionDuration: "[0s]", _groupHover: { transform: "none" } },
});

const VARIANTES: Record<EstiloPropaganda, string> = {
  escuro: css({
    alignItems: "flex-end",
    bg: "escuro",
    color: "fundo",
    _before: { backgroundImage: "[linear-gradient(to top, rgba(5, 5, 5, 0.85) 0%, rgba(5, 5, 5, 0.55) 40%, rgba(5, 5, 5, 0) 75%)]" },
  }),
  claro: css({ alignItems: "flex-end", bg: "escuro", color: "escuro" }),
  topo: css({
    alignItems: "flex-start",
    bg: "escuro",
    color: "fundo",
    _before: { backgroundImage: "[linear-gradient(to bottom, rgba(5, 5, 5, 0.85) 0%, rgba(5, 5, 5, 0.55) 40%, rgba(5, 5, 5, 0) 75%)]" },
  }),
};

// Sem foto: fundo sálvia (escuro e topo) ou sálvia suave (claro), sem degradê.
const SEM_FOTO: Record<EstiloPropaganda, string> = {
  escuro: css({ alignItems: "flex-end", bg: "fundoBanner", color: "fundo" }),
  claro: css({ alignItems: "flex-end", bg: "marcaSuave", color: "escuro" }),
  topo: css({ alignItems: "flex-start", bg: "fundoBannerEscuro", color: "fundo" }),
};

const enfeite = css({
  position: "absolute",
  top: "[12%]",
  right: "[-8%]",
  w: "[70%]",
  h: "[70%]",
  opacity: "[0.14]",
  transform: "rotate(-20deg)",
  pointerEvents: "none",
});

const conteudo = css({
  position: "relative",
  zIndex: "[2]",
  display: "block",
  p: { base: "6", lg: "8", xl: "10" },
  textShadow: "[0 1px 16px rgba(5, 5, 5, 0.35)]", // reforço sobre os trechos claros da foto
});

// Claro: o texto vai num bloco branco encostado na base, como um cartão sobre a foto.
const blocoClaro = css({ m: { base: "4", xl: "6" }, p: { base: "5", xl: "7" }, bg: "fundo", textShadow: "none" });

const chamada = css({
  display: "inline-block",
  mt: "5",
  fontSize: "sm",
  fontWeight: "medium",
  textDecoration: "underline",
  textUnderlineOffset: "4px",
  _groupHover: { textDecorationThickness: "2px" },
});
