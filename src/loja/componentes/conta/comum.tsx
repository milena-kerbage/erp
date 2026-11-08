"use client";

import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botaoContorno, botaoEscuro, linkAcao } from "@/loja/componentes/carrinho/estilos";
import { WhatsappLogo } from "@/loja/componentes/icones";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import { decimal } from "@/loja/lib/carrinho/totais";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { linkWhatsApp } from "@/loja/lib/checkout/pedido";
import { EMPRESA } from "@/loja/lib/empresa";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import { dataDoEnvio, mensagemDeReenvio, type PedidoEnviado, quantidadeDePecas } from "@/loja/lib/pedidos/historico";

// Peças comuns de "Minha conta neste aparelho": card do pedido enviado, botão de reenvio, miniaturas
// e o esqueleto de carregamento (os dados vêm do navegador, depois de montar).

export type FotosPorSlug = Record<string, Foto | undefined>;

export const reais = (valorCentavos: number) => formatarPreco(decimal(valorCentavos));

export const contagemPecas = (quantidade: number) => `${quantidade} ${quantidade === 1 ? "peça" : "peças"}`;

// Abre o WhatsApp do ateliê com a mesma mensagem do pedido (e uma linha avisando que é reenvio).
export function BotaoReenviar({ pedido, contorno = false, className }: { pedido: PedidoEnviado; contorno?: boolean; className?: string }) {
  return (
    <a
      href={linkWhatsApp(EMPRESA.whatsapp.numero, mensagemDeReenvio(pedido))}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(contorno ? botaoContorno : botaoEscuro, className)}
    >
      <WhatsappLogo size={18} aria-hidden /> Reenviar no WhatsApp
      <span className={css({ srOnly: true })}> o pedido {pedido.numero} (abre em nova aba)</span>
    </a>
  );
}

// Até 4 fotos pequenas; o resto vira "+N".
export function Miniaturas({ pedido, fotos }: { pedido: PedidoEnviado; fotos: FotosPorSlug }) {
  const visiveis = pedido.itens.slice(0, 4);
  const resto = pedido.itens.length - visiveis.length;
  return (
    <ul aria-hidden className={css({ display: "flex", gap: "2" })}>
      {visiveis.map((item, indice) => (
        <li key={`${item.slug ?? item.nome}-${indice}`} className={css({ w: "14", flexShrink: "0" })}>
          <FotoProduto foto={item.slug ? fotos[item.slug] : undefined} sizes="56px" className={css({ aspectRatio: "[5 / 6]", borderRadius: "sm" })} />
        </li>
      ))}
      {resto > 0 && (
        <li className={maisItens}>
          +{resto}
        </li>
      )}
    </ul>
  );
}

// Card da lista: data, número, miniaturas, total "a partir de" e as ações.
// `statusRotulo`: situação do pedido no ateliê (pedidos da conta, vindos do servidor).
export function CardPedido({ pedido, fotos, titulo: Titulo = "h2" }: { pedido: PedidoEnviado & { statusRotulo?: string }; fotos: FotosPorSlug; titulo?: "h2" | "h3" }) {
  const href = `/conta/pedidos/${pedido.numero}`;
  return (
    <article aria-labelledby={`pedido-${pedido.numero}`} className={card}>
      <div className={css({ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "2" })}>
        <Titulo id={`pedido-${pedido.numero}`} className={css({ fontSize: "lg", fontWeight: "medium", color: "escuro" })}>
          Enviado em {dataDoEnvio(pedido.enviadoEm)}
        </Titulo>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>
          {pedido.numero}
          {pedido.statusRotulo && <span className={selo}>{pedido.statusRotulo}</span>}
        </p>
      </div>
      <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "4", mt: "4" })}>
        <Miniaturas pedido={pedido} fotos={fotos} />
        <p className={css({ fontSize: "sm", color: "texto", textAlign: { md: "right" } })}>
          {contagemPecas(quantidadeDePecas(pedido))} · {pedido.retirar ? "Retirada no ateliê" : "Entrega a combinar"}
          <span className={css({ display: "block", color: "escuro" })}>
            <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
            <span className={css({ fontSize: "md", fontWeight: "medium" })}>{reais(pedido.totalCentavos)}</span>
          </span>
        </p>
      </div>
      <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4", mt: "5" })}>
        <BotaoReenviar pedido={pedido} contorno />
        <Link href={href} className={linkAcao}>
          Ver detalhes <span className={css({ srOnly: true })}>do pedido {pedido.numero}</span>
        </Link>
      </div>
    </article>
  );
}

export function EsqueletoConta({ blocos = 2 }: { blocos?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className={css({ display: "grid", gap: "4" })}>
      {Array.from({ length: blocos }, (_, indice) => (
        <div key={indice} className={css({ h: "[180px]", borderRadius: "cartao", bg: "placeholder", animation: "pulsar" })} />
      ))}
    </div>
  );
}

const card = css({
  p: { base: "4", md: "6" },
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "cartao",
  bg: "superficie",
});

const selo = css({
  display: "inline-flex",
  ml: "2",
  px: "2",
  py: "0.5",
  borderRadius: "pilula",
  bg: "marcaSuave",
  fontSize: "xs",
  fontWeight: "medium",
  color: "marcaContraste",
});

const maisItens = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "14",
  aspectRatio: "[5 / 6]",
  borderRadius: "sm",
  bg: "superficieSuave",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "texto",
});
