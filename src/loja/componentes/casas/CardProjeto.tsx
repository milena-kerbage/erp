import Image from "next/image";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { EMPRESA } from "@/loja/lib/empresa";
import {
  formatarPreco,
  fotosDoProjeto,
  type Projeto,
  prazoDoProjeto,
  resumoProjeto,
  rotuloEstilo,
  rotuloTema,
} from "@/loja/lib/casas/catalogo";
import { FotosCard } from "./FotosCard";
import { PlaceholderProjeto } from "./PlaceholderProjeto";

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

// Card das vitrines (Adidas, como CardProduto): imagem quadrada, preço em negrito, nome e tema.
export function CardProjetoVitrine({ projeto, tom = 0 }: { projeto: Projeto; tom?: number }) {
  const capa = fotosDoProjeto(projeto)[0];
  return (
    <Link href={`/projetos/${projeto.slug}`} className={cx("group", css({ display: "block" }))}>
      <div className={css({ position: "relative", aspectRatio: "square", overflow: "hidden", bg: "placeholder" })}>
        {capa ? (
          <Image
            src={capa.src}
            alt={capa.alt}
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            className={css({
              objectFit: "cover",
              transition: "transform",
              transitionDuration: "lenta",
              _groupHover: { transform: "scale(1.03)" },
            })}
          />
        ) : (
          <PlaceholderProjeto nome={projeto.nome} paleta={projeto.paleta} tom={tom} tamanho={48} />
        )}
      </div>
      <div className={css({ px: "1", pt: "3", pb: "4" })}>
        <p className={css({ fontSize: "sm", fontWeight: "bold", color: "escuro", fontVariantNumeric: "tabular-nums" })}>
          a partir de {formatarPreco(projeto.precoAPartirDe)}
        </p>
        <p className={nomeVitrine}>{projeto.nome}</p>
        <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>{resumoProjeto(projeto)}</p>
      </div>
    </Link>
  );
}

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

const nomeVitrine = css({
  mt: "1",
  fontSize: "sm",
  lineHeight: "snug",
  color: "escuro",
  lineClamp: "2",
  _groupHover: { textDecoration: "underline", textUnderlineOffset: "3px" },
});
