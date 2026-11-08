import Link from "next/link";
import { css, cx } from "styled-system/css";
import { EMPRESA } from "@/loja/lib/empresa";
import {
  formatarPreco,
  fotosDoProjeto,
  type Projeto,
  prazoDoProjeto,
  rotuloEstilo,
  rotuloTema,
} from "@/loja/lib/casas/catalogo";
import { MODULOS } from "@/loja/lib/casas/modulos";
import { FotoProjeto } from "./FotoProjeto";
import { FotosCard } from "./FotosCard";

// Cards de projeto no mesmo desenho dos cards de produto (listagem/GradeListagem.tsx e
// produto/Vitrine.tsx), com o preço "a partir de" (fictício) do pacote Essencial.

// Card da listagem (Lululemon): imagem 5:6 (fotos passando no hover ou o placeholder com a paleta),
// selo do tema, nome, ateliê e preço na mesma linha, estilo e prazo embaixo.
export function CardProjeto({
  projeto,
  sizes,
  carregarCedo = false,
  nivelTitulo = "h2",
  tom = 0,
}: {
  projeto: Projeto;
  sizes: string;
  carregarCedo?: boolean;
  nivelTitulo?: "h2" | "h3";
  tom?: number;
}) {
  const Titulo = nivelTitulo;
  const href = `/projetos/${projeto.slug}`;
  return (
    <article className={cx("group", css({ h: "full", bg: "fundo" }))}>
      <div className={css({ position: "relative" })}>
        <FotosCard
          href={href}
          nome={projeto.nome}
          fotos={fotosDoProjeto(projeto)}
          paleta={projeto.paleta}
          tom={tom}
          sizes={sizes}
          carregarCedo={carregarCedo}
        />
        <span className={selo}>{rotuloTema(projeto.tema)}</span>
      </div>
      <div className={css({ p: { base: "4", lg: "5" } })}>
        <Titulo className={nome}>
          <Link href={href}>{projeto.nome}</Link>
        </Titulo>
        <div
          className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3", mt: "3", fontSize: "sm" })}
        >
          <span className={css({ color: "textoSuave" })}>{EMPRESA.nomeFantasia}</span>
          <span className={css({ color: "escuro", fontWeight: "medium", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" })}>
            a partir de {formatarPreco(projeto.precoAPartirDe)}
          </span>
        </div>
        <p className={css({ mt: "1", fontSize: "xs", color: "textoSuave", textAlign: "right" })}>
          {rotuloEstilo(projeto.estilo)} · {prazoDoProjeto(projeto)}
        </p>
      </div>
    </article>
  );
}

// Card de entrada do "Monte o seu quartinho" na grade de Projetos: mesmo desenho do card de projeto,
// com a composição de módulos nos tons claros do ateliê no lugar da foto e o menor "a partir de".
export function CardMonteOSeu({ nivelTitulo = "h2" }: { nivelTitulo?: "h2" | "h3" }) {
  const Titulo = nivelTitulo;
  const href = "/projetos/monte-o-seu";
  const menor = Math.min(...MODULOS.map((modulo) => modulo.preco));
  const amostra = MODULOS.filter((modulo) => ["kit-berco", "cortina", "tapete", "almofadas"].includes(modulo.id));
  return (
    <article className={cx("group", css({ h: "full", bg: "fundo" }))}>
      <Link href={href} tabIndex={-1} aria-hidden className={capaMontador}>
        {amostra.map((modulo, indice) => (
          <FotoProjeto
            key={modulo.id}
            paleta={[["#E9E1D3", "#C9DBEA", "#E8C4BC", "#A3B18A"][indice], "#F6F3EC"]}
            icone={modulo.icone}
            bolinhas={false}
            className={css({ w: "full", h: "full" })}
          />
        ))}
        <span className={selo}>Personalizado</span>
      </Link>
      <div className={css({ p: { base: "4", lg: "5" } })}>
        <Titulo className={nome}>
          <Link href={href}>Monte o seu quartinho</Link>
        </Titulo>
        <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3", mt: "3", fontSize: "sm" })}>
          <span className={css({ color: "textoSuave" })}>Tema, paleta e peça por peça</span>
          <span className={css({ color: "escuro", fontWeight: "medium", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" })}>
            peças a partir de {formatarPreco(menor)}
          </span>
        </div>
        <p className={css({ mt: "1", fontSize: "xs", color: "textoSuave", textAlign: "right" })}>Do kit berço à bolsa maternidade</p>
      </div>
    </article>
  );
}

const capaMontador = css({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
  gap: "[2px]",
  aspectRatio: "[5 / 6]",
  bg: "fundo",
  overflow: "hidden",
  "& > div": { transition: "transform", transitionDuration: "zoom", "@media (hover: hover)": { _groupHover: { transform: "scale(1.03)" } } },
  _motionReduce: { "& > div": { _groupHover: { transform: "none" } } },
});

const selo = css({
  position: "absolute",
  top: "3",
  left: "3",
  px: "2",
  py: "1",
  borderRadius: "sm",
  bg: "fundo",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
  pointerEvents: "none",
});

const nome = css({
  fontFamily: "corpo",
  fontSize: "md",
  fontWeight: "medium",
  lineHeight: "snug",
  color: "escuro",
  lineClamp: "2",
  _groupHover: { textDecoration: "underline", textUnderlineOffset: "3px" },
});
