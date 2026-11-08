"use client";

import Link from "next/link";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { botaoEscuro, linkAcao, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { Dialogo } from "@/loja/componentes/carrinho/Dialogo";
import type { PedidoEnviado } from "@/loja/lib/pedidos/historico";
import { CardPedido, EsqueletoConta, type FotosPorSlug } from "./comum";
import { apagarHistorico, usePedidosEnviados } from "./historico";
import { usePedidosDaConta } from "./pedidosConta";

// Pedidos. Logada: os da conta, do SERVIDOR, com a situação no ateliê (a fonte é o servidor; o
// histórico deste aparelho é só cache). Deslogada (ou servidor fora do ar): os enviados deste aparelho,
// com o convite para entrar. A produção, o envio e o rastreio seguem na conversa com a vendedora.
export function PedidosEnviados({ fotos }: { fotos: FotosPorSlug }) {
  const lista = usePedidosDaConta();
  const locais = usePedidosEnviados();
  const [confirmar, setConfirmar] = useState(false);

  const daConta = lista.situacao === "pronta";
  const pedidos: PedidoEnviado[] | null = daConta ? lista.pedidos : lista.situacao === "carregando" ? null : locais;

  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <h1 className={tituloPagina}>{daConta ? "Pedidos" : "Pedidos enviados"}</h1>
      <p className={css({ mt: "3", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
        {daConta
          ? "Os pedidos da sua conta, com a situação no ateliê. A produção, o envio e o rastreio são combinados na conversa com a vendedora."
          : "Os pedidos que você enviou pelo WhatsApp a partir deste aparelho."}
      </p>
      {lista.situacao === "deslogada" && (
        <p className={aviso}>
          <Link href="/conta/entrar?voltar=/conta/pedidos" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
            Entre na sua conta
          </Link>{" "}
          para ver os seus pedidos em qualquer aparelho.
        </p>
      )}
      {lista.situacao === "erro" && (
        <p role="alert" className={aviso}>
          {lista.mensagem} Abaixo, os pedidos salvos neste aparelho.
        </p>
      )}

      <div className={css({ mt: "8" })}>
        {pedidos === null ? (
          <EsqueletoConta />
        ) : pedidos.length === 0 ? (
          <div className={css({ maxW: "leitura" })}>
            <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
              Nenhum pedido ainda. Quando você fizer um pedido pela sacola, ele aparece aqui para você rever e reenviar.
            </p>
            <Link href="/carrinho" className={cx(botaoEscuro, css({ mt: "6" }))}>
              Ir para a sacola
            </Link>
          </div>
        ) : (
          <>
            <ul className={css({ display: "grid", gap: "4" })}>
              {pedidos.map((pedido) => (
                <li key={pedido.numero}>
                  <CardPedido pedido={pedido} fotos={fotos} />
                </li>
              ))}
            </ul>
            {!daConta && (
              <button type="button" onClick={() => setConfirmar(true)} className={cx(linkAcao, css({ mt: "8" }))}>
                Apagar o histórico deste aparelho
              </button>
            )}
          </>
        )}
      </div>

      <Dialogo aberto={confirmar} aoFechar={() => setConfirmar(false)} titulo="Apagar o histórico?">
        <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
          Os pedidos saem só deste aparelho. Os pedidos da sua conta, as conversas no WhatsApp e os pedidos no ateliê continuam como estão.
        </p>
        <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "6" })}>
          <button
            type="button"
            onClick={() => {
              apagarHistorico();
              setConfirmar(false);
            }}
            className={botaoEscuro}
          >
            Apagar histórico
          </button>
          <button type="button" onClick={() => setConfirmar(false)} className={linkAcao}>
            Cancelar
          </button>
        </div>
      </Dialogo>
    </div>
  );
}

const aviso = css({ mt: "5", maxW: "leitura", p: "4", borderRadius: "md", bg: "fundoSutil", fontSize: "sm", lineHeight: "texto", color: "texto" });
