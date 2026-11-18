import {ImagemNativa as Image} from "./ImagemNativa";
import { css, cx } from "styled-system/css";
import type { TomMidia } from "@/loja/componentes/inicio/Midia";
import { ehFotoDoCatalogo, type Foto } from "@/loja/lib/catalogo/fotos";
import { fotoDeEspera } from "@/loja/lib/fotosAtelie";
import { brilhoAoCarregar } from "./esqueleto";
import { ImagemSuave } from "./ImagemSuave";

// Foto do produto (fundo de estúdio, 1:1) ou, enquanto a peça não tem foto, uma foto do ateliê
// (fotosAtelie.ts, decorativa): nunca o bloco só com ícone.
// Quem usa define o formato pela className (aspectRatio ou w/h) e diz em `sizes` a largura real
// que a foto ocupa, para o next/image não baixar a versão de 1600 px numa miniatura.
// A foto preenche toda a moldura com recorte centralizado, inclusive quando as proporções diferem,
// sem deixar faixas do fundo nas laterais ou no topo.
// `segunda`: a 2ª foto, que entra por cima no hover do card (classe "group"), só onde há mouse.
// `cor` e `rotulo` variam a foto do ateliê usada na falta da foto da peça. A foto entra com fade.
export function FotoProduto({
  foto,
  segunda,
  sizes,
  className,
  rotulo,
  tom = "claro",
  cor,
  preload = false,
}: {
  foto?: Foto;
  segunda?: Foto;
  sizes: string;
  className?: string;
  rotulo?: string; // varia a foto do ateliê quando a peça ainda não tem foto
  tom?: "claro" | "forte";
  cor?: TomMidia;
  preload?: boolean; // primeira foto da página de produto (LCP)
}) {
  if (!foto) foto = { ...fotoDeEspera("bebe", `${rotulo ?? ""}|${cor ?? ""}|${tom}`), alt: "" };
  return (
    <div className={cx(moldura, brilhoAoCarregar, className)}>
      <ImagemSuave src={foto.src} alt={foto.alt} fill sizes={sizes} preload={preload} className={css({ objectFit: "cover", objectPosition: "center" })} />
      {segunda && <Image src={segunda.src} alt="" fill sizes={sizes} unoptimized={ehFotoDoCatalogo(segunda.src)} className={fotoHover} />}
    </div>
  );
}

const fotoHover = css({
  objectFit: "cover",
  objectPosition: "center",
  opacity: "0",
  transition: "opacity",
  transitionDuration: "lenta",
  "@media (hover: hover)": { _groupHover: { opacity: "1" } },
});

const moldura = css({ position: "relative", flexShrink: "0", overflow: "hidden", bg: "fundoProduto" });
