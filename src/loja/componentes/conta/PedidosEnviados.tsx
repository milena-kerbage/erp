"use client";

import Link from "next/link";
import { useState } from "react";
import { css, cx } from "styled-system/css";
import { botaoEscuro, linkAcao, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { Dialogo } from "@/loja/componentes/carrinho/Dialogo";
import { CardPedido, EsqueletoConta, type FotosPorSlug } from "./comum";
import { apagarHistorico, usePedidosEnviados } from "./historico";

// "Pedidos enviados": os pedidos que saíram deste aparelho para o WhatsApp do ateliê, do mais novo ao
// mais antigo, com reenvio e detalhes. O acompanhamento de verdade é a conversa com a vendedora.
export function PedidosEnviados({ fotos }: { fotos: FotosPorSlug }) {
  const pedidos = usePedidosEnviados();
  const [confirmar, setConfirmar] = useState(false);

  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <h1 className={tituloPagina}>Pedidos enviados</h1>
      <p className={css({ mt: "3", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
        Os pedidos que você enviou pelo WhatsApp a partir deste aparelho. A produção, o envio e o rastreio são acompanhados na conversa com
        a vendedora.
      </p>

      <div className={css({ mt: "8" })}>
        {pedidos === null ? (
          <EsqueletoConta />
        ) : pedidos.length === 0 ? (
          <div className={css({ maxW: "leitura" })}>
            <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
              Nenhum pedido enviado deste aparelho ainda. Quando você fizer um pedido pela sacola, ele aparece aqui para você rever e
              reenviar.
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
            <button type="button" onClick={() => setConfirmar(true)} className={cx(linkAcao, css({ mt: "8" }))}>
              Apagar o histórico deste aparelho
            </button>
          </>
        )}
      </div>

      <Dialogo aberto={confirmar} aoFechar={() => setConfirmar(false)} titulo="Apagar o histórico?">
        <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
          Os pedidos saem só deste aparelho. As conversas no WhatsApp e os pedidos no ateliê continuam como estão.
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
