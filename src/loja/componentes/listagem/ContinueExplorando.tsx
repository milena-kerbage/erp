import Link from "next/link";
import { css } from "styled-system/css";
import { Imagem, legenda, TituloSecao } from "@/loja/componentes/inicio/blocos";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import type { Elo } from "@/loja/lib/catalogo/categorias";

// Fim da listagem: "Continue explorando", no formato do "Shop popular categories" da Lululemon
// (6 fotos coladas com legenda), seguido de pílulas com mais categorias. Links rastreáveis no HTML
// do servidor: também reforçam a navegação interna para o Google (seo.md).
export function ContinueExplorando({ base, categorias }: { base: string; categorias: Elo[] }) {
  if (categorias.length === 0) return null;
  const destaques = categorias.slice(0, 6);
  const demais = categorias.slice(6);
  return (
    <section
      aria-labelledby="titulo-continue"
      className={css({ px: RESPIRO_LATERAL, pt: { base: "6", lg: "10" }, pb: { base: "16", lg: "24" } })}
    >
      <TituloSecao id="titulo-continue" titulo="Continue explorando." complemento={`Combina com ${base.toLowerCase()}.`} />
      <ul
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" },
          rowGap: "8",
        })}
      >
        {destaques.map((categoria, indice) => (
          <li key={categoria.href}>
            <Link
              href={categoria.href}
              className={css({ display: "block", _hover: { "& > span": { textDecoration: "underline", textUnderlineOffset: "3px" } } })}
            >
              <Imagem rotulo={categoria.rotulo} tom={indice % 2 ? "forte" : "claro"} className={css({ aspectRatio: "portrait" })} />
              <span className={legenda}>{categoria.rotulo}</span>
            </Link>
          </li>
        ))}
      </ul>
      {demais.length > 0 && (
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", mt: "10" })}>
          <span className={css({ mr: "2", fontSize: "sm", fontWeight: "medium", color: "textoSuave" })}>Mais categorias</span>
          {demais.map((categoria) => (
            <Link key={categoria.href} href={categoria.href} className={pilula}>
              {categoria.rotulo}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const pilula = css({
  display: "inline-flex",
  alignItems: "center",
  h: "9",
  px: "4",
  borderRadius: "full",
  bg: "superficieSuave",
  fontSize: "sm",
  color: "escuro",
  _hover: { bg: "borda" },
});
