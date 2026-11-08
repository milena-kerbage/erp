"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { css, cx } from "styled-system/css";
import { botaoEscuro, linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { Dialogo } from "@/loja/componentes/carrinho/Dialogo";
import { ArrowLeft } from "@/loja/componentes/icones";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import { buscarNoHistorico, dataDoEnvio, quantidadeDePecas } from "@/loja/lib/pedidos/historico";
import type { StatusPedido } from "@/loja/lib/contas/regras";
import { BotaoReenviar, contagemPecas, EsqueletoConta, type FotosPorSlug, reais } from "./comum";
import { chamarConta, type PedidoLoja, useCliente } from "./estadoConta";
import { apagarPedidoEnviado, usePedidosEnviados } from "./historico";
import { LinhaDoTempo } from "./LinhaDoTempo";
import { type PedidoDaConta, paraPedidoEnviado } from "./pedidosConta";

// Detalhe de um pedido enviado deste aparelho: as peças com as opções e os valores "a partir de", a
// entrega escolhida e a mensagem exata que foi para o WhatsApp, com o reenvio e a remoção do aparelho.
export function DetalhePedidoEnviado({ numero, fotos }: { numero: string; fotos: FotosPorSlug }) {
  const locais = usePedidosEnviados();
  const cliente = useCliente();
  const roteador = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  // Logada: o pedido vem do servidor (com a situação). Sem conta ou fora do ar: o histórico deste aparelho.
  const [servidor, setServidor] = useState<PedidoDaConta | null | undefined>(undefined);
  useEffect(() => {
    if (cliente === undefined) return;
    if (cliente === null) {
      setServidor(null);
      return;
    }
    let ativo = true;
    chamarConta<{ pedido: PedidoLoja }>(`conta/pedidos/${encodeURIComponent(numero)}`)
      .then((dados) => ativo && setServidor(paraPedidoEnviado(dados.pedido)))
      .catch(() => ativo && setServidor(null));
    return () => {
      ativo = false;
    };
  }, [cliente, numero]);
  const pedidos = servidor === undefined ? null : locais;

  const voltar = (
    <Link href="/conta/pedidos" className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1.5", mt: "6" }))}>
      <ArrowLeft size={16} aria-hidden /> Pedidos
    </Link>
  );

  if (pedidos === null) {
    return (
      <div className={css({ mt: "6" })}>
        <EsqueletoConta blocos={1} />
      </div>
    );
  }

  const pedido: PedidoDaConta | undefined = servidor ?? buscarNoHistorico(pedidos, numero);
  if (!pedido) {
    return (
      <div className={css({ maxW: "leitura" })}>
        {voltar}
        <h1 className={cx(tituloPagina, css({ mt: "6" }))}>Pedido não encontrado</h1>
        <p className={css({ mt: "4", fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
          O pedido {numero} não está na sua conta nem salvo neste navegador. {cliente ? "" : "Entre na sua conta para ver os pedidos de qualquer aparelho. "} Para saber como está um
          pedido, fale com a vendedora pela conversa do WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div>
      {voltar}
      <header className={css({ mt: "6" })}>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>{pedido.numero}{pedido.statusRotulo ? ` · ${pedido.statusRotulo}` : ""}</p>
        <h1 className={cx(tituloPagina, css({ mt: "1" }))}>Pedido enviado em {dataDoEnvio(pedido.enviadoEm)}</h1>
        <p className={css({ mt: "3", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
          Este é o resumo do que você mandou ao ateliê. Valores, frete e prazo finais são os confirmados pela vendedora na conversa.
        </p>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4", mt: "6" })}>
          <BotaoReenviar pedido={pedido} />
          {!servidor && (
            <button type="button" onClick={() => setConfirmar(true)} className={linkAcao}>
              Remover deste aparelho
            </button>
          )}
        </div>
        {pedido.status && <LinhaDoTempo status={pedido.status as StatusPedido} />}
      </header>

      <div className={grade}>
        <section aria-labelledby="titulo-pecas" className={css({ minW: "0" })}>
          <h2 id="titulo-pecas" className={tituloBloco}>
            Peças{" "}
            <span className={css({ fontSize: "md", letterSpacing: "normal", color: "textoSuave" })}>{contagemPecas(quantidadeDePecas(pedido))}</span>
          </h2>
          <ul className={css({ display: "grid", gap: "5", mt: "6" })}>
            {pedido.itens.map((item, indice) => (
              <li
                key={`${item.slug ?? item.nome}-${indice}`}
                className={css({ display: "grid", gridTemplateColumns: "[72px minmax(0, 1fr)]", gap: "4", alignItems: "start" })}
              >
                <FotoProduto foto={item.slug ? fotos[item.slug] : undefined} sizes="72px" className={css({ aspectRatio: "[5 / 6]" })} />
                <div className={css({ minW: "0", fontSize: "sm", lineHeight: "texto" })}>
                  {item.href ? (
                    <Link href={item.href} className={css({ fontSize: "md", color: "escuro", _hover: { textDecoration: "underline" } })}>
                      {item.nome}
                    </Link>
                  ) : (
                    <p className={css({ fontSize: "md", color: "escuro" })}>{item.nome}</p>
                  )}
                  {item.codigo && <p className={css({ fontSize: "xs", color: "textoSuave" })}>Cód. {item.codigo}</p>}
                  <p className={css({ color: "textoSuave" })}>Quantidade: {item.quantidade}</p>
                  {item.detalhes.map((linha) => (
                    <p key={linha} className={css({ color: "textoSuave" })}>
                      {linha}
                    </p>
                  ))}
                  <p className={css({ mt: "1", color: "escuro" })}>
                    <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
                    {reais(item.precoCentavos * item.quantidade)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="titulo-resumo" className={css({ minW: "0" })}>
          <h2 id="titulo-resumo" className={tituloBloco}>
            Resumo
          </h2>
          <dl className={css({ display: "grid", gap: "3", mt: "6", fontSize: "sm" })}>
            <Linha rotulo="Subtotal" valor={`a partir de ${reais(pedido.subtotalCentavos)}`} />
            {pedido.cupom && <Linha rotulo={`Cupom ${pedido.cupom.codigo}`} valor={`− ${reais(pedido.cupom.descontoCentavos)}`} />}
            <Linha rotulo="Frete" valor={pedido.retirar ? "Retirada no ateliê" : "A combinar pelo WhatsApp"} />
            {pedido.local && <Linha rotulo="Cidade/UF ou CEP" valor={pedido.local} />}
            <div className={css({ pt: "3", borderTopWidth: "1px", borderColor: "borda" })}>
              <Linha rotulo="Total estimado" valor={`a partir de ${reais(pedido.totalCentavos)}`} forte />
            </div>
          </dl>

          <h3 className={css({ mt: "10", fontSize: "md", fontWeight: "medium", color: "escuro" })}>Mensagem enviada</h3>
          <pre className={mensagem}>{pedido.mensagem}</pre>
        </aside>
      </div>

      <Dialogo aberto={confirmar} aoFechar={() => setConfirmar(false)} titulo="Remover este pedido?">
        <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
          O pedido sai só da lista deste aparelho. A conversa no WhatsApp e o pedido no ateliê não mudam.
        </p>
        <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "6" })}>
          <button
            type="button"
            onClick={() => {
              apagarPedidoEnviado(pedido.numero);
              setConfirmar(false);
              roteador.push("/conta/pedidos");
            }}
            className={botaoEscuro}
          >
            Remover
          </button>
          <button type="button" onClick={() => setConfirmar(false)} className={linkAcao}>
            Cancelar
          </button>
        </div>
      </Dialogo>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={css({ display: "flex", justifyContent: "space-between", gap: "3", fontWeight: forte ? "medium" : "normal" })}>
      <dt className={css({ color: forte ? "escuro" : "texto" })}>{rotulo}</dt>
      <dd className={css({ color: "escuro", textAlign: "right", overflowWrap: "anywhere" })}>{valor}</dd>
    </div>
  );
}

const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[minmax(0, 7fr) minmax(0, 5fr)]" },
  gap: { base: "12", desktop: "16" },
  mt: { base: "10", desktop: "14" },
  alignItems: "start",
});

const mensagem = css({
  mt: "3",
  p: "4",
  borderRadius: "md",
  bg: "fundoSutil",
  fontFamily: "corpo",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  maxH: "[480px]",
  overflowY: "auto",
});
