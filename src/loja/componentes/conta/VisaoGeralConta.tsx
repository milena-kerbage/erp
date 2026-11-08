"use client";

import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botaoContorno, linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { Gift, IdentificationCard } from "@/loja/componentes/icones";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { dataDoEnvio } from "@/loja/lib/pedidos/historico";
import { PERCENTUAL_BOAS_VINDAS } from "@/loja/lib/contas/regras";
import { AcessoConta } from "./AcessoConta";
import { AvatarCliente } from "./AvatarCliente";
import { CardPedido, EsqueletoConta, type FotosPorSlug } from "./comum";
import { ConviteCupom } from "./ConviteCupom";
import { type ContaCliente, useConta } from "./estadoConta";
import { FavoritosAparelho } from "./FavoritosAparelho";
import { usePedidosEnviados } from "./historico";
import { usePedidosDaConta } from "./pedidosConta";

// Minha conta. Logada: saudação, cupom de primeira compra (disponível ou usado), convite para completar
// o perfil, últimos pedidos (do servidor) e favoritos. Deslogada: entrar ou criar a conta (com o convite
// do cupom), os favoritos e os pedidos já enviados deste aparelho.
export function VisaoGeralConta({ catalogo, fotos }: { catalogo: ProdutoCarrinho[]; fotos: FotosPorSlug }) {
  const conta = useConta();

  if (conta.situacao === "carregando") {
    return (
      <div className={css({ mt: { base: "8", desktop: "12" } })}>
        <EsqueletoConta blocos={2} />
      </div>
    );
  }
  if (conta.situacao === "pronta" && conta.cliente) return <Logada cliente={conta.cliente} cupom={conta.cupom} catalogo={catalogo} fotos={fotos} />;
  return <Deslogada catalogo={catalogo} fotos={fotos} indisponivel={conta.situacao === "indisponivel" ? conta.mensagem : ""} />;
}

function Logada({ cliente, cupom, catalogo, fotos }: { cliente: ContaCliente; cupom: { codigo: string; usado: boolean; usadoEm: string | null; pedido: string | null } | null; catalogo: ProdutoCarrinho[]; fotos: FotosPorSlug }) {
  const lista = usePedidosDaConta();
  const faltando = cliente.faltando.length;

  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <div className={css({ display: "flex", alignItems: "center", gap: { base: "3", md: "4" } })}>
        <AvatarCliente cliente={cliente} tamanho={56} />
        <h1 className={tituloPagina}>Olá, {cliente.primeiroNome}</h1>
      </div>
      <p className={css({ mt: "3", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
        Seus pedidos, favoritos e dados ficam aqui, em qualquer aparelho em que você entrar.
      </p>

      <div className={css({ display: "grid", gap: "4", mt: "8", gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "repeat(2, minmax(0, 1fr))" } })}>
        {cupom && !cupom.usado ? (
          <ConviteCupom
            titulo={`Seu cupom de ${PERCENTUAL_BOAS_VINDAS}% OFF na primeira compra`}
            acao={
              <Link href="/carrinho" className={botaoContorno}>
                Usar na sacola
              </Link>
            }
          >
            <strong className={css({ fontWeight: "semibold", color: "escuro", letterSpacing: "wide" })}>{cupom.codigo}</strong> · exclusivo da sua conta,
            uso único. Ele já entra sozinho na sacola; um cupom por pedido.
          </ConviteCupom>
        ) : cupom ? (
          <div className={cartaoSimples}>
            <Gift size={22} aria-hidden className={css({ flexShrink: "0", color: "textoSuave" })} />
            <p>
              Cupom de primeira compra <strong className={css({ fontWeight: "medium", color: "escuro" })}>{cupom.codigo}</strong> usado
              {cupom.pedido ? (
                <>
                  {" "}
                  no pedido{" "}
                  <Link href={`/conta/pedidos/${cupom.pedido}`} className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                    {cupom.pedido}
                  </Link>
                </>
              ) : null}
              {cupom.usadoEm ? `, em ${dataDoEnvio(cupom.usadoEm)}` : ""}. Obrigada pela compra!
            </p>
          </div>
        ) : null}
        {faltando > 0 && (
          <div className={cartaoSimples}>
            <IdentificationCard size={22} aria-hidden className={css({ flexShrink: "0", color: "marca" })} />
            <div>
              <p className={css({ fontWeight: "medium", color: "escuro" })}>Complete o seu perfil (opcional)</p>
              <p className={css({ mt: "1" })}>
                Endereço, CPF e a data prevista do bebê ajudam a vendedora a agilizar o seu pedido. Só se você quiser.
              </p>
              <Link href="/conta/dados" className={cx(linkAcao, css({ display: "inline-block", mt: "2" }))}>
                Completar dados
              </Link>
            </div>
          </div>
        )}
      </div>

      <section aria-labelledby="titulo-ultimos" className={css({ mt: { base: "10", desktop: "14" } })}>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
          <h2 id="titulo-ultimos" className={tituloBloco}>
            Últimos pedidos
          </h2>
          {lista.situacao === "pronta" && lista.pedidos.length > 0 && (
            <Link href="/conta/pedidos" className={linkAcao}>
              Ver todos ({lista.pedidos.length})
            </Link>
          )}
        </div>
        <div className={css({ mt: "5" })}>
          {lista.situacao === "carregando" || lista.situacao === "deslogada" ? (
            <EsqueletoConta blocos={1} />
          ) : lista.situacao === "erro" ? (
            <p role="alert" className={css({ fontSize: "md", color: "erro" })}>
              {lista.mensagem}
            </p>
          ) : lista.pedidos.length === 0 ? (
            <p className={css({ maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
              Nenhum pedido ainda. Monte a{" "}
              <Link href="/carrinho" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                sacola
              </Link>{" "}
              e faça o pedido pelo WhatsApp: ele aparece aqui.
            </p>
          ) : (
            <ul className={css({ display: "grid", gap: "4", gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "repeat(2, minmax(0, 1fr))" } })}>
              {lista.pedidos.slice(0, 2).map((pedido) => (
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

function Deslogada({ catalogo, fotos, indisponivel }: { catalogo: ProdutoCarrinho[]; fotos: FotosPorSlug; indisponivel: string }) {
  const locais = usePedidosEnviados();

  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <div className={css({ display: "grid", gap: { base: "8", desktop: "16" }, gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[minmax(0, 6fr) minmax(0, 5fr)]" }, alignItems: "start" })}>
        <section aria-labelledby="titulo-acesso">
          <h1 id="titulo-acesso" className={tituloPagina}>
            Minha conta
          </h1>
          <p className={css({ mt: "3", mb: "8", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
            Entre ou crie a sua conta para fazer pedidos e acompanhar tudo em qualquer aparelho.
          </p>
          {indisponivel ? (
            <p role="alert" className={css({ p: "4", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", color: "erro" })}>
              {indisponivel}
            </p>
          ) : (
            <AcessoConta />
          )}
        </section>
        <ConviteCupom>
          O cupom é exclusivo da sua conta, de uso único, e entra sozinho na sacola. Não acumula com outros cupons. O 5% OFF no Pix é uma
          condição à parte, combinada com a vendedora.
        </ConviteCupom>
      </div>

      {locais && locais.length > 0 && (
        <section aria-labelledby="titulo-aparelho" className={css({ mt: { base: "14", desktop: "20" } })}>
          <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
            <h2 id="titulo-aparelho" className={tituloBloco}>
              Pedidos enviados deste aparelho
            </h2>
            <Link href="/conta/pedidos" className={linkAcao}>
              Ver todos ({locais.length})
            </Link>
          </div>
          <ul className={css({ display: "grid", gap: "4", mt: "5", gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "repeat(2, minmax(0, 1fr))" } })}>
            {locais.slice(0, 2).map((pedido) => (
              <li key={pedido.numero}>
                <CardPedido pedido={pedido} fotos={fotos} titulo="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={css({ mt: { base: "14", desktop: "20" } })}>
        <FavoritosAparelho catalogo={catalogo} limite={4} titulo="h2" />
      </div>
    </div>
  );
}

const cartaoSimples = css({
  display: "flex",
  gap: "3",
  alignItems: "flex-start",
  p: { base: "4", md: "5" },
  borderRadius: "cartao",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
});
