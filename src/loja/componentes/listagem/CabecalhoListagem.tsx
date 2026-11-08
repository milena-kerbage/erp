import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { css } from "styled-system/css";
import type { Elo } from "@/loja/lib/catalogo/categorias";

// Topo da listagem da Lululemon (lululemon-pdp.md §3 e §6): trilha de 14, título de 64/70.4 (24/31.2
// no celular) com a contagem pequena em cinza alinhada à base e a linha de subcategorias em texto
// (links de 16; 14 com rolagem horizontal no celular). Os links levam às subcategorias, às facetas
// do menu ou às categorias vizinhas.
// "unidade" e "icone" servem à área Projetos (projetos em vez de peças; atalhos de informação, como
// "2 quartos", viram ícone e texto em vez de foto).
export function CabecalhoListagem({
  trilha,
  titulo,
  total,
  atalhos,
  unidade = ["peça", "peças"],
}: {
  trilha: Elo[];
  titulo: string;
  total: number;
  atalhos: Array<Elo & { foto?: string; icone?: Icon }>;
  unidade?: [singular: string, plural: string];
}) {
  return (
    <header className={margem}>
      {trilha.length > 0 && (
        <nav aria-label="Você está em" className={css({ pt: "5" })}>
          <ol className={css({ display: "flex", flexWrap: "wrap", gap: "1", fontSize: "sm", lineHeight: "texto", color: "escuro" })}>
            {[{ rotulo: "Página inicial", href: "/" }, ...trilha].map((elo, indice) => (
              <li key={elo.href} className={css({ display: "flex", gap: "1" })}>
                {indice > 0 && <span aria-hidden>/</span>}
                <Link href={elo.href} className={css({ _hover: { textDecoration: "underline", textUnderlineOffset: "[4px]" } })}>
                  {elo.rotulo}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <h1 className={tituloListagem}>
        {titulo}{" "}
        <span className={contagem}>
          {total} {total === 1 ? unidade[0] : unidade[1]}
        </span>
      </h1>

      {atalhos.length > 0 && atalhos.every((atalho) => atalho.icone) && (
        <ul className={fileiraIcones}>
          {atalhos.slice(0, 6).map(({ href, rotulo, icone: Icone }) => (
            <li key={href} className={css({ flex: "[1 0 0]", minW: { base: "[40vw]", md: "[160px]" }, scrollSnapAlign: "start" })}>
              <Link href={href} className={atalhoIcone}>
                {Icone && <Icone size={28} weight="light" aria-hidden />}
                <span>{rotulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Subcategorias em linha de texto (16/400, ~14 de espaço); no celular 14 com rolagem horizontal. */}
      {atalhos.length > 0 && !atalhos.every((atalho) => atalho.icone) && (
        <nav aria-label="Subcategorias">
          <ul className={linhaSubcategorias}>
            {atalhos.map((atalho) => (
              <li key={atalho.href} className={css({ flexShrink: "0" })}>
                <Link href={atalho.href} className={linkSubcategoria}>
                  {atalho.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

// Margem da página: 12 (celular), 20 (tablet), 40 (desktop), como a home.
const margem = css({ px: { base: "3", md: "5", desktop: "10" } });

const tituloListagem = css({
  mt: { base: "6", desktop: "16" },
  fontFamily: "corpo",
  fontSize: { base: "2xl", md: "secaoTablet", desktop: "secao" },
  fontWeight: "normal",
  lineHeight: { base: "subtitulo", md: "titulo" },
  letterSpacing: { base: "bloco", md: "titulo" },
  color: "escuro",
});

const contagem = css({ ml: "1", fontSize: { base: "sm", md: "md" }, fontWeight: "normal", letterSpacing: "normal", color: "textoSuave", whiteSpace: "nowrap" });

const linhaSubcategorias = css({
  display: "flex",
  gap: { base: "3", desktop: "3.5" },
  mt: { base: "4", desktop: "6" },
  mx: { base: "-3", md: "0" },
  px: { base: "3", md: "0" },
  flexWrap: { base: "nowrap", md: "wrap" },
  overflowX: { base: "auto", md: "visible" },
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const linkSubcategoria = css({
  display: "inline-block",
  py: "1",
  fontSize: { base: "sm", md: "md" },
  lineHeight: "texto",
  color: "escuro",
  whiteSpace: "nowrap",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  textDecorationColor: "transparent",
  transitionProperty: "text-decoration-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { textDecorationColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const fileiraIcones = css({
  display: "flex",
  gap: "[2px]",
  mt: { base: "6", lg: "8" },
  overflowX: "auto",
  scrollSnapType: "x",
  scrollSnapStrictness: "mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

// Atalho de informação: ícone de traço fino e o texto, num bloco cinza claro (como o cinza das fotos).
const atalhoIcone = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "6",
  h: "full",
  minH: { base: "[104px]", lg: "[120px]" },
  p: { base: "4", lg: "5" },
  bg: "superficieSuave",
  fontSize: "md",
  color: "escuro",
  transition: "colors",
  transitionDuration: "rapida",
  _hover: { bg: "borda", "& span": { textDecoration: "underline", textUnderlineOffset: "3px" } },
  _focusVisible: { outline: "[2px solid token(colors.foco)]", outlineOffset: "[-2px]" },
});
