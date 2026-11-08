import Image from "next/image";
import { css, cx } from "styled-system/css";
import { Baby } from "@/loja/componentes/icones";
import type { TomMidia } from "@/loja/componentes/inicio/Midia";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { brilhoAoCarregar } from "./esqueleto";
import { ImagemSuave } from "./ImagemSuave";

// Foto do produto (fundo de estúdio, 1:1) ou, enquanto a peça não tem foto, o bloco de espera:
// fundo de estúdio com o ícone de bebê em sálvia suave, no centro.
// Quem usa define o formato pela className (aspectRatio ou w/h) e diz em `sizes` a largura real
// que a foto ocupa, para o next/image não baixar a versão de 1600 px numa miniatura.
// Em moldura mais alta que larga (cards 5:6 da listagem) a foto fica inteira e centrada: a moldura tem
// o mesmo tom do fundo da foto (token fundoProduto), então não aparece emenda.
// `segunda`: a 2ª foto, que entra por cima no hover do card (classe "group"), só onde há mouse.
// `cor`: tom do tecido no bloco de espera (cards): cada cor da peça tem o seu, então trocar a cor no
// card troca a "foto" mesmo antes das fotos reais. A foto real entra com fade quando carrega.
export function FotoProduto({
  foto,
  segunda,
  sizes,
  className,
  tom = "claro",
  cor,
  preload = false,
}: {
  foto?: Foto;
  segunda?: Foto;
  sizes: string;
  className?: string;
  rotulo?: string; // legado do wireframe: o bloco de espera não mostra mais rótulo
  tom?: "claro" | "forte";
  cor?: TomMidia;
  preload?: boolean; // primeira foto da página de produto (LCP)
}) {
  if (!foto) {
    return (
      <div aria-hidden data-tinta={cor && TINTAS[cor] ? "" : undefined} className={cx(moldura, espera, tom === "forte" && esperaForte, cor && TINTAS[cor], className)}>
        <Baby weight="thin" className={icone} />
      </div>
    );
  }
  return (
    <div className={cx(moldura, brilhoAoCarregar, className)}>
      <ImagemSuave src={foto.src} alt={foto.alt} fill sizes={sizes} preload={preload} className={css({ objectFit: "contain" })} />
      {segunda && <Image src={segunda.src} alt="" fill sizes={sizes} className={fotoHover} />}
    </div>
  );
}

const fotoHover = css({
  objectFit: "contain",
  opacity: "0",
  transition: "opacity",
  transitionDuration: "lenta",
  "@media (hover: hover)": { _groupHover: { opacity: "1" } },
});

const moldura = css({ position: "relative", flexShrink: "0", overflow: "hidden", bg: "fundoProduto" });

const espera = css({ display: "flex", alignItems: "center", justifyContent: "center" });

// Tom "forte": a miniatura selecionada (cor atual) e as linhas do resumo do checkout.
const esperaForte = css({ bg: "marcaSuave" });

// O ícone acompanha o tamanho da moldura: 36% do lado, do card grande à miniatura de 44 px.
const icone = css({ w: "[36%]", h: "[36%]", maxW: "[160px]", maxH: "[160px]", color: "logo", opacity: "[0.45]" });

// Tom do tecido no bloco de espera, misturado ao fundo de estúdio (sem perder o ícone). Os tons que
// não são de tecido ficam no fundo de estúdio.
const TINTAS: Partial<Record<TomMidia, string>> = {
  rose: css({ "&[data-tinta]": { bg: "[color-mix(in srgb, token(colors.tecido.rose) 55%, token(colors.fundoProduto))]" } }),
  azul: css({ "&[data-tinta]": { bg: "[color-mix(in srgb, token(colors.tecido.azulBebe) 55%, token(colors.fundoProduto))]" } }),
  verde: css({ "&[data-tinta]": { bg: "[color-mix(in srgb, token(colors.tecido.salvia) 55%, token(colors.fundoProduto))]" } }),
  cru: css({ "&[data-tinta]": { bg: "[color-mix(in srgb, token(colors.tecido.cru) 70%, token(colors.fundoProduto))]" } }),
  cinza: css({ "&[data-tinta]": { bg: "[color-mix(in srgb, token(colors.tecido.cinza) 55%, token(colors.fundoProduto))]" } }),
  branco: css({ "&[data-tinta]": { bg: "superficie" } }),
};
