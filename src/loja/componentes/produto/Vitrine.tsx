import Link from "next/link";
import { css, cx } from "styled-system/css";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import { BotaoFavoritar } from "./BotaoFavoritar";
import { FotoProduto } from "./FotoProduto";

// Card e vitrine de sugestões da página de produto (modelo Adidas), num arquivo leve: o carrinho
// reaproveita sem levar o catálogo de exemplo para o navegador.
export type CartaoProduto = { slug: string; nome: string; preco: string; marca: string; foto?: Foto; segunda?: Foto };

export function CardProduto({ produto }: { produto: CartaoProduto }) {
  return (
    <Link href={`/produto/${produto.slug}`} className={cx("group", css({ display: "block" }))}>
      <div className={css({ position: "relative" })}>
        <FotoProduto
          foto={produto.foto}
          segunda={produto.segunda}
          sizes="(min-width: 768px) 25vw, 50vw"
          rotulo="Foto 1:1"
          className={css({ aspectRatio: "square" })}
        />
        <BotaoFavoritar slug={produto.slug} nome={produto.nome} variante="card" />
      </div>
      <div className={css({ px: "1", pt: "3", pb: "4" })}>
        <p className={css({ fontSize: "sm", fontWeight: "bold", color: "escuro" })}>{formatarPreco(produto.preco)}</p>
        <p className={nomeCard}>{produto.nome}</p>
        <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>{produto.marca}</p>
      </div>
    </Link>
  );
}

// "Complete seu look" / "Você também poderá gostar" da Adidas: título em caixa alta e grade de 4.
export function VitrineSugestoes({
  id,
  titulo,
  produtos,
  recuo = true,
}: {
  id: string;
  titulo: string;
  produtos: CartaoProduto[];
  recuo?: boolean; // false quando a página já tem o respiro lateral (carrinho)
}) {
  if (produtos.length === 0) return null;
  return (
    <section aria-labelledby={id} className={css({ mt: { base: "14", lg: "16" } })}>
      <h2 id={id} className={cx(tituloVitrine, recuo && comRecuo)}>
        {titulo}
      </h2>
      <ul
        className={cx(
          css({
            display: "grid",
            gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: "2",
            mt: "6",
          }),
          recuo && comRecuo,
        )}
      >
        {produtos.map((produto) => (
          <li key={produto.slug}>
            <CardProduto produto={produto} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const nomeCard = css({
  mt: "1",
  fontSize: "sm",
  lineHeight: "snug",
  color: "escuro",
  lineClamp: "2",
  _groupHover: { textDecoration: "underline", textUnderlineOffset: "3px" },
});

// Título das vitrines da Adidas (caixa alta, condensado, pesado).
const tituloVitrine = css({
  fontFamily: "titulo",
  fontSize: { base: "2xl", lg: "3xl" },
  fontWeight: "extrabold",
  letterSpacing: "tight",
  textTransform: "uppercase",
  color: "escuro",
});

const comRecuo = css({ px: { base: "4", lg: "8" } });
