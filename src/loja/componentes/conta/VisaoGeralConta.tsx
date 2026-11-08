"use client";

import Link from "next/link";
import { css, cx } from "styled-system/css";
import { linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { Info } from "@/loja/componentes/icones";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { CardPedido, EsqueletoConta, type FotosPorSlug } from "./comum";
import { FavoritosAparelho } from "./FavoritosAparelho";
import { usePedidosEnviados } from "./historico";

// "Minha conta neste aparelho": sem login (a loja não tem cadastro). Explica onde os dados ficam e
// mostra os últimos pedidos enviados e os primeiros favoritos, com atalhos para as abas completas.
export function VisaoGeralConta({ catalogo, fotos }: { catalogo: ProdutoCarrinho[]; fotos: FotosPorSlug }) {
  const pedidos = usePedidosEnviados();

  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <h1 className={tituloPagina}>Minha conta neste aparelho</h1>
      <div className={aviso}>
        <Info size={20} aria-hidden className={css({ flexShrink: "0", mt: "0.5" })} />
        <p>
          A loja não tem cadastro nem login. Seus favoritos e os pedidos que você enviou pelo WhatsApp ficam salvos só neste navegador: em
          outro aparelho, ou se limpar os dados do navegador, a lista começa vazia.{" "}
          <Link href="/politicas/cookies#armazenamento" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
            O que fica salvo
          </Link>
        </p>
      </div>

      <section aria-labelledby="titulo-ultimos" className={css({ mt: { base: "10", desktop: "14" } })}>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
          <h2 id="titulo-ultimos" className={tituloBloco}>
            Pedidos enviados
          </h2>
          {pedidos && pedidos.length > 0 && (
            <Link href="/conta/pedidos" className={linkAcao}>
              Ver todos ({pedidos.length})
            </Link>
          )}
        </div>
        <div className={css({ mt: "5" })}>
          {pedidos === null ? (
            <EsqueletoConta blocos={1} />
          ) : pedidos.length === 0 ? (
            <p className={css({ maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
              Nenhum pedido enviado deste aparelho. Monte a <Link href="/carrinho" className={cx(linkAcao, css({ fontSize: "inherit" }))}>sacola</Link>{" "}
              e faça o pedido pelo WhatsApp: ele aparece aqui para você rever e reenviar.
            </p>
          ) : (
            <ul className={css({ display: "grid", gap: "4", gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "repeat(2, minmax(0, 1fr))" } })}>
              {pedidos.slice(0, 2).map((pedido) => (
                <li key={pedido.numero}>
                  <CardPedido pedido={pedido} fotos={fotos} titulo="h3" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className={css({ mt: { base: "14", desktop: "20" } })}>
        <FavoritosAparelho catalogo={catalogo} limite={4} titulo="h2" />
      </div>
    </div>
  );
}

const aviso = css({
  display: "flex",
  gap: "3",
  maxW: "leitura",
  mt: "5",
  p: "4",
  borderRadius: "lg",
  bg: "fundoSutil",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
});
