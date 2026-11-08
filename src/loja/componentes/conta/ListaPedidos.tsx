"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { reais } from "@/loja/componentes/carrinho/Resumo";
import { ArrowRight, Info, MagnifyingGlass, Package, PixLogo, Storefront } from "@/loja/componentes/icones";
import { acoes, dataCurta, type Filtro, noFiltro, type Pedido, progresso, situacao } from "@/loja/lib/pedidos/status";
import { BarraProgresso, comprarDeNovo, Miniaturas, mensagemPrincipal, SeloStatus } from "./comum";
import { usePedidosSimulados } from "./pedidosSimulados";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "andamento", rotulo: "Em andamento" },
  { id: "concluidos", rotulo: "Concluídos" },
  { id: "cancelados", rotulo: "Cancelados" },
];

const totalItens = (pedido: Pedido) => pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);

// "Meus pedidos" (referencia.md §16): primeiro o que pede ação (Pix pendente, pronto para retirar),
// depois a lista em cards com situação, progresso, previsão e o atalho certo para cada caso.
// Quem comprou sem cadastro acompanha pelo número do pedido. Os pedidos simulados no checkout
// (navegador) entram antes dos de exemplo.
export function ListaPedidos({ exemplos }: { exemplos: Pedido[] }) {
  const simulados = usePedidosSimulados();
  const roteador = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [numero, setNumero] = useState("");
  const [documento, setDocumento] = useState("");
  const [erroBusca, setErroBusca] = useState("");
  const [adicionado, setAdicionado] = useState<string | null>(null);

  const pedidos = useMemo(() => [...(simulados ?? []), ...exemplos], [simulados, exemplos]);
  const atencao = pedidos.filter((pedido) => situacao(pedido.status).tom === "atencao");
  const termo = busca.trim().toLowerCase();
  const visiveis = pedidos.filter(
    (pedido) =>
      noFiltro(pedido.status, filtro) &&
      (!termo || pedido.numero.toLowerCase().includes(termo) || pedido.itens.some((item) => item.nome.toLowerCase().includes(termo))),
  );

  function acompanhar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const alvo = numero.trim().toUpperCase().replace(/^(\d)/, "MK-$1");
    // No real, a API confere o número com o CPF/CNPJ ou e-mail da compra (o número sozinho não basta).
    if (!documento.trim()) return setErroBusca("Informe o CPF, CNPJ ou e-mail usado na compra.");
    if (pedidos.some((pedido) => pedido.numero === alvo)) roteador.push(`/conta/pedidos/${alvo}`);
    else setErroBusca("Não encontramos esse pedido. O número está no e-mail de confirmação (ex.: MK-482913).");
  }

  return (
    <>
      <div className={topo}>
        <div>
          <h1 className={css({ fontSize: { base: "3xl", lg: "4xl" }, fontWeight: "normal", letterSpacing: "[-0.03em]", color: "escuro" })}>
            Meus pedidos
          </h1>
          <p className={css({ mt: "1", color: "textoSuave" })}>Acompanhe a entrega, pague o Pix pendente e compre de novo.</p>
        </div>
        <form onSubmit={acompanhar} className={formBusca} aria-labelledby="titulo-sem-cadastro">
          <p id="titulo-sem-cadastro" className={css({ fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>
            Comprou sem cadastro?
          </p>
          <div
            className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr) auto" }, gap: "2" })}
          >
            <label htmlFor="numero-pedido" className={css({ srOnly: true })}>
              Número do pedido
            </label>
            <input
              id="numero-pedido"
              value={numero}
              onChange={(evento) => {
                setNumero(evento.target.value);
                setErroBusca("");
              }}
              placeholder="Nº do pedido"
              aria-invalid={erroBusca ? true : undefined}
              aria-describedby={erroBusca ? "erro-numero" : undefined}
              className={campo}
            />
            <label htmlFor="documento-pedido" className={css({ srOnly: true })}>
              CPF, CNPJ ou e-mail da compra
            </label>
            <input
              id="documento-pedido"
              value={documento}
              onChange={(evento) => {
                setDocumento(evento.target.value);
                setErroBusca("");
              }}
              placeholder="CPF ou e-mail"
              autoComplete="email"
              className={campo}
            />
            <button type="submit" className={botao({ variante: "escuro", tamanho: "p" })}>
              Acompanhar
            </button>
          </div>
          {erroBusca && (
            <p id="erro-numero" role="alert" className={css({ fontSize: "xs", color: "erro" })}>
              {erroBusca}
            </p>
          )}
        </form>
      </div>

      <p role="note" className={aviso}>
        <Info size={18} aria-hidden className={css({ flexShrink: "0" })} />
        Wireframe: pedidos de exemplo (fictícios) e os que você simulou no checkout. Os reais entram com o login e a API de pedidos.
      </p>

      {atencao.length > 0 && (
        <section aria-labelledby="titulo-atencao" className={css({ mt: "6" })}>
          <h2 id="titulo-atencao" className={css({ srOnly: true })}>
            Precisam da sua atenção
          </h2>
          <ul className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: "3" })}>
            {atencao.map((pedido) => (
              <li key={pedido.numero}>
                <Link href={`/conta/pedidos/${pedido.numero}`} className={cartaoAtencao}>
                  {pedido.status === "aguardando_pagamento" ? <PixLogo size={24} aria-hidden /> : <Storefront size={24} aria-hidden />}
                  <span className={css({ flex: "1", minW: "0" })}>
                    <span className={css({ display: "block", fontWeight: "semibold", color: "escuro" })}>{mensagemPrincipal(pedido)}</span>
                    <span className={css({ display: "block", fontSize: "sm", color: "texto" })}>
                      {pedido.numero} · {reais(pedido.valores.total)}
                    </span>
                  </span>
                  <span
                    className={css({
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "1",
                      fontSize: "sm",
                      fontWeight: "semibold",
                      color: "escuro",
                    })}
                  >
                    {pedido.status === "aguardando_pagamento" ? "Pagar agora" : "Ver código"} <ArrowRight size={16} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={barraFiltros}>
        <div
          role="radiogroup"
          aria-label="Filtrar pedidos"
          className={css({ display: "flex", gap: "2", overflowX: "auto", scrollbarWidth: "none" })}
        >
          {FILTROS.map((item) => {
            const quantidade = pedidos.filter((pedido) => noFiltro(pedido.status, item.id)).length;
            return (
              <label key={item.id} className={pilula}>
                <input
                  type="radio"
                  name="filtro-pedidos"
                  checked={filtro === item.id}
                  onChange={() => setFiltro(item.id)}
                  className={css({ srOnly: true })}
                />
                {item.rotulo} <span className={css({ color: "inherit", opacity: "0.7" })}>{quantidade}</span>
              </label>
            );
          })}
        </div>
        <div className={css({ position: "relative", w: { base: "full", md: "[300px]" } })}>
          <MagnifyingGlass
            size={18}
            aria-hidden
            className={css({ position: "absolute", left: "3", top: "[50%]", transform: "translateY(-50%)", color: "textoSuave" })}
          />
          <label htmlFor="busca-pedidos" className={css({ srOnly: true })}>
            Buscar por número ou produto
          </label>
          <input
            id="busca-pedidos"
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por número ou produto"
            className={cx(campo, css({ w: "full", pl: "10" }))}
          />
        </div>
      </div>

      {simulados === null ? (
        <div aria-busy="true" className={css({ display: "grid", gap: "3", mt: "4" })}>
          {[1, 2, 3].map((linha) => (
            <div key={linha} className={css({ h: "[168px]", borderRadius: "cartao", bg: "placeholder" })} />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <div className={css({ py: "16", textAlign: "center" })}>
          <Package size={40} aria-hidden className={css({ mx: "auto", color: "textoSuave" })} />
          <p className={css({ mt: "3", fontSize: "lg", color: "escuro" })}>
            {pedidos.length === 0 ? "Você ainda não fez pedidos." : "Nenhum pedido encontrado."}
          </p>
          {pedidos.length === 0 ? (
            <Link href="/" className={cx(botao({ variante: "contorno", tamanho: "m" }), css({ mt: "6" }))}>
              Começar a comprar
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFiltro("todos");
                setBusca("");
              }}
              className={cx(botao({ variante: "contorno", tamanho: "m" }), css({ mt: "6" }))}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className={css({ display: "grid", gap: "3", mt: "4" })}>
          {visiveis.map((pedido) => {
            const permitido = acoes(pedido);
            const tom = situacao(pedido.status).tom;
            const quantidade = totalItens(pedido);
            return (
              <li key={pedido.numero} className={cartao}>
                <div className={cabecalhoCartao}>
                  <p className={css({ fontSize: "sm", color: "textoSuave" })}>
                    <strong className={css({ color: "escuro", fontWeight: "semibold" })}>{pedido.numero}</strong> ·{" "}
                    {dataCurta(pedido.criadoEm)}
                    {pedido.simulado && <span className={etiqueta}>Simulado</span>}
                  </p>
                  <SeloStatus status={pedido.status} />
                </div>

                <div className={corpoCartao}>
                  <Miniaturas itens={pedido.itens} />
                  <div className={css({ minW: "0" })}>
                    <p className={css({ fontSize: "lg", fontWeight: "semibold", color: "escuro" })}>{mensagemPrincipal(pedido)}</p>
                    <p className={css({ mt: "0.5", fontSize: "sm", color: "texto", lineClamp: "1" })}>
                      {pedido.itens[0].nome}
                      {pedido.itens.length > 1 &&
                        ` e mais ${pedido.itens.length - 1} ${pedido.itens.length === 2 ? "produto" : "produtos"}`}
                    </p>
                    <p className={css({ mt: "0.5", fontSize: "sm", color: "textoSuave" })}>
                      {quantidade} {quantidade === 1 ? "item" : "itens"} · {reais(pedido.valores.total)} ·{" "}
                      {pedido.entrega.tipo === "retirada"
                        ? pedido.entrega.local
                        : `${pedido.entrega.modalidade} para ${pedido.entrega.destino}`}
                    </p>
                    {pedido.status !== "cancelado" && (
                      <div className={css({ mt: "3", maxW: "[420px]" })}>
                        <BarraProgresso valor={progresso(pedido)} tom={tom} />
                      </div>
                    )}
                  </div>
                  <div className={acoesCartao}>
                    <Link href={`/conta/pedidos/${pedido.numero}`} className={botao({ variante: "escuro", tamanho: "p" })}>
                      {permitido.pagar ? "Pagar com Pix" : "Acompanhar pedido"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        comprarDeNovo(pedido.itens);
                        setAdicionado(pedido.numero);
                      }}
                      className={botao({ variante: "contorno", tamanho: "p" })}
                    >
                      Comprar de novo
                    </button>
                  </div>
                </div>
                {adicionado === pedido.numero && (
                  <p role="status" className={css({ px: { base: "4", md: "5" }, pb: "4", fontSize: "sm", color: "sucesso" })}>
                    Itens adicionados ao carrinho.{" "}
                    <Link
                      href="/carrinho"
                      className={css({ fontWeight: "semibold", textDecoration: "underline", textUnderlineOffset: "3px" })}
                    >
                      Ver carrinho
                    </Link>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const topo = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "minmax(0, 1fr) 520px" },
  alignItems: "end",
  gap: "5",
  mt: { base: "6", lg: "8" },
});

const formBusca = css({
  display: "grid",
  gap: "2",
  p: "4",
  borderRadius: "md",
  bg: "fundoSutil",
  borderWidth: "1px",
  borderColor: "borda",
});

const campo = css({
  flex: "1",
  minW: "0",
  h: "10",
  px: "3",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  bg: "fundo",
  fontSize: "sm",
  color: "escuro",
  _placeholder: { color: "textoSuave" },
  _focusVisible: { borderColor: "escuro", outline: "none" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const aviso = css({ display: "flex", alignItems: "center", gap: "2", mt: "5", fontSize: "xs", color: "textoSuave" });

const cartaoAtencao = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  p: "4",
  borderRadius: "md",
  bg: "alertaSuave",
  color: "alerta",
  _hover: { "& > span:last-child": { textDecoration: "underline", textUnderlineOffset: "3px" } },
});

const barraFiltros = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "stretch", md: "center" },
  justifyContent: "space-between",
  gap: "3",
  mt: "8",
});

const pilula = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  flexShrink: "0",
  h: "9",
  px: "4",
  borderRadius: "full",
  borderWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  _hover: { borderColor: "escuro" },
  "&:has(input:checked)": { bg: "escuro", borderColor: "escuro", color: "fundo" },
  "&:has(input:focus-visible)": { outline: "[2px solid token(colors.foco)]", outlineOffset: "[2px]" },
});

const cartao = css({ borderWidth: "1px", borderColor: "borda", borderRadius: "cartao", overflow: "hidden" });

const cabecalhoCartao = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  px: { base: "4", md: "5" },
  py: "3",
  bg: "fundoSutil",
  borderBottomWidth: "1px",
  borderColor: "borda",
});

const corpoCartao = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "auto minmax(0, 1fr) auto" },
  alignItems: "center",
  gap: { base: "4", md: "6" },
  px: { base: "4", md: "5" },
  py: "5",
});

const acoesCartao = css({
  display: "flex",
  flexDirection: { base: "row", md: "column" },
  gap: "2",
  "& > *": { flex: { base: "1", md: "none" }, minW: { md: "[180px]" } },
});

const etiqueta = css({
  ml: "2",
  px: "2",
  py: "0.5",
  borderRadius: "sm",
  bg: "superficieSuave",
  fontSize: "2xs",
  fontWeight: "semibold",
  textTransform: "uppercase",
  letterSpacing: "wide",
  color: "textoSuave",
});
