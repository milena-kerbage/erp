"use client";

import Link from "next/link";
import { css, cx } from "styled-system/css";
import { Carrossel } from "@/loja/componentes/inicio/Carrossel";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import { tituloBloco } from "./estilos";

// Vitrine da sacola no estilo do carrossel de produtos da home (lululemon-referencia.md §3.7): trilho
// com snap de ponta a ponta e setas com contorno embaixo; card sem borda, foto 5:6 (2ª foto no
// hover), nome 14/500 em até 2 linhas e preço. Os dados vêm do catálogo da sacola (navegador).
export function CarrosselSacola({ id, titulo, produtos }: { id: string; titulo: string; produtos: ProdutoCarrinho[] }) {
  if (produtos.length === 0) return null;
  return (
    <section aria-labelledby={id} className={css({ containerType: "inline-size", my: { base: "16", desktop: "24" } })}>
      <h2 id={id} className={cx(tituloBloco, css({ mx: { base: "3", md: "5", desktop: "10" }, mb: { base: "6", desktop: "8" } }))}>
        {titulo}
      </h2>
      <Carrossel rotulo={titulo} classeTrilho={trilho} classeSetas={setas}>
        {produtos.map((produto) => (
          <li key={produto.slug} className={item}>
            <article className={cx("group", css({ position: "relative" }))}>
              <FotoProduto
                foto={produto.foto}
                segunda={produto.segunda}
                sizes="(min-width: 992px) 22vw, (min-width: 768px) 42vw, 72vw"
                className={css({ aspectRatio: "[5 / 6]" })}
              />
              <div className={info}>
                <h3 className={nome}>
                  <Link href={`/produto/${produto.slug}`} className={linkCobre}>
                    {produto.nome}
                  </Link>
                </h3>
                <p className={css({ flexShrink: "0", fontSize: { base: "xs", desktop: "sm" }, lineHeight: "texto", color: "escuro" })}>
                  <span className={css({ color: "textoSuave" })}>a partir de </span>
                  {formatarPreco(produto.preco)}
                </p>
              </div>
            </article>
          </li>
        ))}
      </Carrossel>
    </section>
  );
}

const trilho = css({ gap: { base: "3", md: "5" }, px: { base: "3", md: "5" }, scrollPaddingInline: { base: "3", md: "5" } });

// Mesma fórmula da home: celular 100% − 112; tablet 2 + espiada; desktop 4 + espiada.
const item = css({
  w: {
    base: "[calc(100cqw - 112px)]",
    md: "[calc((100cqw - max(min(12cqw, 200px), 15cqw) - 20px) / 2)]",
    desktop: "[calc((100cqw - max(min(12cqw, 200px), 7.5cqw) - 60px) / 4)]",
  },
});

const setas = css({ px: { base: "3", md: "5", desktop: "10" } });

const info = css({
  display: "flex",
  flexDirection: { base: "column", desktop: "row" },
  alignItems: { base: "flex-start", desktop: "baseline" },
  justifyContent: "space-between",
  gap: { base: "1", desktop: "2" },
  pt: "4",
  px: { base: "3", desktop: "5" },
});

const nome = css({
  fontSize: { base: "sm", desktop: "md" },
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  lineClamp: "2",
});

const linkCobre = css({
  _after: { content: '""', position: "absolute", inset: "0" },
  _focusVisible: { outline: "none", _after: { boxShadow: "anelFoco" } },
});
