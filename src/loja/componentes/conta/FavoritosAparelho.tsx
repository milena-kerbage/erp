"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import {
  adicionarAoCarrinho,
  type ItemCarrinho,
  tirarDosFavoritos,
  useFavoritos,
} from "@/loja/componentes/carrinho/estado";
import { botaoContorno, botaoEscuro, largo, linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { type AlvoEdicao, PainelEditar, personalizacaoPadrao } from "@/loja/componentes/carrinho/PainelEditar";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";

// Favoritos deste aparelho (localStorage `mk_favoritos`, os mesmos da sacola e do coração da página de
// produto), com "Mover para a sacola" e "Remover", como os itens salvos da sacola. Peça com tamanho
// obrigatório abre o painel "Editar" da sacola para escolher antes. `limite`: só os primeiros, na
// visão geral da conta.
export function FavoritosAparelho({
  catalogo,
  limite,
  titulo = "h1",
}: {
  catalogo: ProdutoCarrinho[];
  limite?: number;
  titulo?: "h1" | "h2";
}) {
  const favoritos = useFavoritos();
  const porSlug = useMemo(() => new Map(catalogo.map((produto) => [produto.slug, produto])), [catalogo]);
  const [edicao, setEdicao] = useState<AlvoEdicao | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const produtos = favoritos.flatMap((slug) => porSlug.get(slug) ?? []);
  const visiveis = limite ? produtos.slice(0, limite) : produtos;
  const Titulo = titulo;

  function mover(produto: ProdutoCarrinho) {
    const item: ItemCarrinho = {
      slug: produto.slug,
      quantidade: 1,
      ...(produto.personalizacao ? { personalizacao: personalizacaoPadrao(produto) } : {}),
    };
    if (produto.opcoes && produto.opcoes.length > 0) return setEdicao({ modo: "mover", item });
    adicionarAoCarrinho(item);
    tirarDosFavoritos(produto.slug);
    setAnuncio(`${produto.nome} foi para a sacola.`);
  }

  return (
    <section aria-labelledby="titulo-favoritos">
      <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
        <Titulo id="titulo-favoritos" className={titulo === "h1" ? tituloPagina : tituloBloco}>
          Favoritos
        </Titulo>
        {limite && produtos.length > limite && (
          <Link href="/conta/favoritos" className={linkAcao}>
            Ver todos ({produtos.length})
          </Link>
        )}
      </div>

      <p role="status" className={css({ srOnly: true })}>
        {anuncio}
      </p>

      {produtos.length === 0 ? (
        <div className={css({ maxW: "leitura", mt: "4" })}>
          <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
            Nenhuma peça salva neste aparelho. Toque no coração da página de produto, ou em Salvar nos favoritos na sacola, para guardar
            peças para depois.
          </p>
          <Link href="/pronta-entrega" className={cx(botaoEscuro, css({ mt: "6" }))}>
            Ver pronta entrega
          </Link>
        </div>
      ) : (
        <ul className={grade}>
          {visiveis.map((produto) => (
            <li key={produto.slug} className={css({ display: "flex", flexDirection: "column", minW: "0" })}>
              <Link href={`/produto/${produto.slug}`} tabIndex={-1} aria-hidden className={css({ display: "block" })}>
                <FotoProduto
                  foto={produto.foto}
                  segunda={produto.segunda}
                  sizes="(min-width: 992px) 240px, 50vw"
                  className={css({ aspectRatio: "[5 / 6]" })}
                />
              </Link>
              <Link
                href={`/produto/${produto.slug}`}
                className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "escuro", lineClamp: "2", _hover: { textDecoration: "underline" } })}
              >
                {produto.nome}
              </Link>
              <p className={css({ mt: "1", mb: "4", fontSize: "sm", color: "escuro" })}>
                <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
                {formatarPreco(produto.preco)}
              </p>
              <button type="button" onClick={() => mover(produto)} className={cx(botaoContorno, largo, css({ mt: "auto", px: "3" }))}>
                Mover para a sacola
              </button>
              <button
                type="button"
                onClick={() => {
                  tirarDosFavoritos(produto.slug);
                  setAnuncio(`${produto.nome} saiu dos favoritos.`);
                }}
                className={cx(linkAcao, css({ mt: "3", alignSelf: "center" }))}
              >
                Remover <span className={css({ srOnly: true })}>{produto.nome} dos favoritos</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {edicao && (
        <PainelEditar
          key={`${edicao.item.slug}-${edicao.item.personalizacao ?? ""}`}
          alvo={edicao}
          porSlug={porSlug}
          aoFechar={() => setEdicao(null)}
          aoSalvar={(alvo, novo) => {
            adicionarAoCarrinho(novo);
            tirarDosFavoritos(alvo.item.slug);
            setAnuncio(`${porSlug.get(novo.slug)?.nome ?? "A peça"} foi para a sacola.`);
          }}
        />
      )}
    </section>
  );
}

const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", desktop: "repeat(4, minmax(0, 1fr))" },
  columnGap: { base: "2", md: "5" },
  rowGap: { base: "8", md: "10" },
  mt: "6",
});
