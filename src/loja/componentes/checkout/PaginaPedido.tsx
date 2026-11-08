"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import {
  chaveItem,
  esvaziarCarrinho,
  salvarPreferenciasCompra,
  useItensCarrinho,
  usePreferenciasCompra,
} from "@/loja/componentes/carrinho/estado";
import { botaoContorno, botaoEscuro, largo, linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { atributosDe } from "@/loja/componentes/carrinho/ItemSacola";
import { reais } from "@/loja/componentes/carrinho/Resumo";
import { CheckCircle, WhatsappLogo } from "@/loja/componentes/icones";
import { useLocal } from "@/loja/componentes/localizacao/estado";
import { FotoItem } from "@/loja/componentes/carrinho/FotoItem";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { linhaDoPedido, resolverItem } from "@/loja/lib/carrinho/linhas";
import { CUPONS, calcularTotais, centavos, DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import { type ClientePedido, errosPedido, LIMITE_OBSERVACOES, linkWhatsApp, montarMensagemPedido } from "@/loja/lib/checkout/pedido";
import { type Erros, mascararTelefone } from "@/loja/lib/checkout/validacao";
import { EMPRESA } from "@/loja/lib/empresa";
import { criarPedidoEnviado } from "@/loja/lib/pedidos/historico";
import { registrarPedidoEnviado } from "@/loja/componentes/conta/historico";
import { AreaTexto, Campo, Marcacao } from "./Campo";

const ORDEM_CAMPOS = ["nome", "whatsapp", "local", "observacoes"] as const;

// Pedido pelo WhatsApp (no lugar do checkout com pagamento): a loja é um CATÁLOGO COM PREÇO. A cliente
// revisa as peças, deixa nome e WhatsApp (cidade/UF ou CEP, retirada no ateliê e observações são
// opcionais) e o site abre a conversa com o ateliê com a mensagem pronta; uma vendedora confirma
// valores, bordado, frete, prazo e pagamento ali. Nada é cobrado nem enviado ao servidor: os dados da
// cliente vão só na mensagem, e um resumo fica no navegador (Minha conta › Pedidos enviados).
// Mesmo layout mínimo da sacola (grupo compra).
export function PaginaPedido({ catalogo }: { catalogo: ProdutoCarrinho[] }) {
  const itens = useItensCarrinho();
  const preferencias = usePreferenciasCompra();
  const local = useLocal();
  const porSlug = useMemo(() => new Map(catalogo.map((produto) => [produto.slug, produto])), [catalogo]);
  const [cliente, setCliente] = useState<ClientePedido>({ nome: "", whatsapp: "", local: "", retirar: false, observacoes: "" });
  const [erros, setErros] = useState<Erros>({});
  const [enviado, setEnviado] = useState<string | null>(null);

  // CEP já informado no cabeçalho e a escolha de retirada (página de produto) chegam preenchidos.
  useEffect(() => {
    if (local) setCliente((atual) => (atual.local ? atual : { ...atual, local: `${local.cidade}/${local.uf}` }));
  }, [local]);
  useEffect(() => {
    if (preferencias.entrega === "retirada") setCliente((atual) => ({ ...atual, retirar: true }));
  }, [preferencias.entrega]);

  if (enviado) return <Enviado link={enviado} />;
  if (itens === null) return <Esqueleto />;

  const linhas = itens.flatMap((item) => {
    const produto = resolverItem(item, porSlug);
    return produto ? [{ item, produto }] : [];
  });
  if (linhas.length === 0) return <Vazio />;

  const cupom = CUPONS.find((item) => item.codigo === preferencias.cupom);
  const totais = calcularTotais(
    linhas.map(({ item, produto }) => ({ preco: produto.preco, quantidade: item.quantidade })),
    cupom,
  );

  function mudar<K extends keyof ClientePedido>(campo: K, valor: ClientePedido[K]) {
    setCliente((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: "" }));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos = errosPedido(cliente);
    setErros(novos);
    const primeiro = ORDEM_CAMPOS.find((campo) => novos[campo]);
    if (primeiro) {
      document.getElementById(`pedido-${primeiro}`)?.focus();
      return;
    }
    const texto = montarMensagemPedido({
      // Produtos, projetos e o quartinho personalizado, cada um com os seus detalhes (linhaDoPedido).
      linhas: linhas.map(({ item, produto }) => linhaDoPedido(item, produto)),
      cliente,
      cupom: cupom && totais.descontoCupom > 0 ? { codigo: cupom.codigo, descontoCentavos: totais.descontoCupom } : undefined,
      descontoPixPercentual: DESCONTO_PIX_PERCENTUAL,
    });
    const link = linkWhatsApp(EMPRESA.whatsapp.numero, texto);
    // "Minha conta neste aparelho": guarda o resumo do pedido enviado só no navegador, para rever e
    // reenviar (lib/pedidos/historico.ts). Nada vai para o servidor.
    registrarPedidoEnviado(
      criarPedidoEnviado({
        itens: linhas.map(({ item, produto }) => ({
          ...linhaDoPedido(item, produto),
          slug: produto.slug,
          href: produto.href ?? `/produto/${produto.slug}`,
        })),
        cupom: cupom && totais.descontoCupom > 0 ? { codigo: cupom.codigo, descontoCentavos: totais.descontoCupom } : undefined,
        retirar: cliente.retirar,
        local: cliente.local,
        mensagem: texto,
      }),
    );
    salvarPreferenciasCompra({ entrega: cliente.retirar ? "retirada" : "endereco" });
    // Dentro do clique (gesto da cliente): o navegador deixa abrir a aba do WhatsApp.
    window.open(link, "_blank", "noopener,noreferrer");
    setEnviado(link);
  }

  return (
    <div className={pagina}>
      <div className={grade}>
        <section aria-labelledby="titulo-pedido" className={colunaPrincipal}>
          <h1 id="titulo-pedido" className={tituloPagina}>
            Fazer pedido
          </h1>
          <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "texto", maxW: "leitura" })}>
            Deixe seu contato e o pedido segue pelo WhatsApp do ateliê, com a mensagem pronta. Uma vendedora confirma valores,
            bordado, frete e prazo e combina o pagamento por lá. Nada é cobrado no site.
          </p>

          <form noValidate onSubmit={enviar} className={formulario}>
            <Campo
              id="pedido-nome"
              rotulo="Nome completo"
              required
              autoComplete="name"
              value={cliente.nome}
              onChange={(evento) => mudar("nome", evento.target.value)}
              erro={erros.nome}
            />
            <Campo
              id="pedido-whatsapp"
              rotulo="WhatsApp com DDD"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(85) 99999-9999"
              value={cliente.whatsapp}
              onChange={(evento) => mudar("whatsapp", mascararTelefone(evento.target.value))}
              erro={erros.whatsapp}
              dica="A vendedora do ateliê responde por este número."
            />
            <Campo
              id="pedido-local"
              rotulo="Cidade/UF ou CEP"
              autoComplete="off"
              placeholder="Ex.: Recife/PE ou 50000-000"
              maxLength={80}
              value={cliente.local}
              onChange={(evento) => mudar("local", evento.target.value)}
              erro={erros.local}
              dica="Ajuda a cotar o frete."
            />
            <Marcacao id="pedido-retirar" checked={cliente.retirar} onChange={(evento) => mudar("retirar", evento.target.checked)}>
              Prefiro retirar no ateliê, em Fortaleza
            </Marcacao>
            <AreaTexto
              id="pedido-observacoes"
              rotulo="Observações"
              maxLength={LIMITE_OBSERVACOES}
              rows={3}
              placeholder="Ex.: nome para o bordado, data prevista do parto"
              value={cliente.observacoes}
              onChange={(evento) => mudar("observacoes", evento.target.value)}
              erro={erros.observacoes}
            />
            <div>
              <button type="submit" className={cx(botaoEscuro, largo)}>
                <WhatsappLogo size={18} aria-hidden /> Fazer pedido pelo WhatsApp
              </button>
              <p className={css({ mt: "3", fontSize: "xs", lineHeight: "texto", color: "textoSuave", textAlign: "center" })}>
                O WhatsApp abre com a mensagem do pedido: é só enviar. Seus dados vão só nessa mensagem, e um resumo fica salvo neste
                aparelho, em Minha conta.{" "}
                <Link href="/politicas/privacidade" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                  Privacidade
                </Link>
              </p>
            </div>
          </form>
        </section>

        <aside aria-labelledby="titulo-revisao" className={colunaResumo}>
          <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
            <h2 id="titulo-revisao" className={tituloBloco}>
              Seu pedido
            </h2>
            <Link href="/carrinho" className={linkAcao}>
              Editar sacola
            </Link>
          </div>
          <ul className={css({ display: "grid", gap: "4", mt: "6" })}>
            {linhas.map(({ item, produto }) => (
              <li
                key={chaveItem(item)}
                className={css({ display: "grid", gridTemplateColumns: "[64px minmax(0, 1fr)]", gap: "3", alignItems: "start" })}
              >
                <FotoItem produto={produto} sizes="64px" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
                <div className={css({ minW: "0", fontSize: "sm", lineHeight: "texto" })}>
                  <p className={css({ color: "escuro" })}>{produto.nome}</p>
                  <p className={css({ fontSize: "xs", color: "textoSuave" })}>Quantidade: {item.quantidade}</p>
                  {atributosDe(produto, item).map((linha) => (
                    <p key={linha} className={css({ fontSize: "xs", color: "textoSuave" })}>
                      {linha}
                    </p>
                  ))}
                  <p className={css({ mt: "1", color: "escuro" })}>
                    <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
                    {reais(centavos(produto.preco) * item.quantidade)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <dl className={css({ display: "grid", gap: "3", mt: "6", pt: "4", borderTopWidth: "1px", borderColor: "borda", fontSize: "sm" })}>
            <Linha rotulo={`Subtotal (${totais.itens} ${totais.itens === 1 ? "item" : "itens"})`} valor={`a partir de ${reais(totais.subtotal)}`} />
            {cupom && totais.descontoCupom > 0 && <Linha rotulo={`Cupom ${cupom.codigo}`} valor={`− ${reais(totais.descontoCupom)}`} />}
            <Linha rotulo="Frete" valor="A combinar pelo WhatsApp" />
            <Linha rotulo="Total estimado" valor={`a partir de ${reais(totais.totalCartao)}`} forte />
          </dl>
          <p className={css({ mt: "3" })}>
            <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
          </p>
        </aside>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={css({ display: "flex", justifyContent: "space-between", gap: "3", fontWeight: forte ? "medium" : "normal" })}>
      <dt className={css({ color: forte ? "escuro" : "texto" })}>{rotulo}</dt>
      <dd className={css({ color: "escuro", textAlign: "right" })}>{valor}</dd>
    </div>
  );
}

// Depois de enviar: o WhatsApp abriu em outra aba (ou foi bloqueado). Link de reserva e a escolha
// entre esvaziar a sacola ou mantê-la.
function Enviado({ link }: { link: string }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [esvaziada, setEsvaziada] = useState(false);

  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <div className={pagina}>
      <div className={css({ maxW: "leitura" })}>
        <CheckCircle size={40} aria-hidden className={css({ color: "sucesso" })} />
        <h1 ref={titulo} tabIndex={-1} className={cx(tituloPagina, css({ mt: "4" }))}>
          Pedido enviado para o ateliê
        </h1>
        <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "texto" })}>
          Abrimos o WhatsApp com a mensagem do seu pedido: é só enviar. Uma vendedora do ateliê continua a conversa por lá, confirma
          valores, bordado, frete e prazo e combina o pagamento.
        </p>
        <p className={css({ mt: "4" })}>
          <a href={link} target="_blank" rel="noopener noreferrer" className={linkAcao}>
            Se o WhatsApp não abriu, toque aqui
          </a>
        </p>
        <p className={css({ mt: "2", fontSize: "sm", color: "textoSuave" })}>
          O resumo ficou salvo neste aparelho, em{" "}
          <Link href="/conta/pedidos" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
            Minha conta › Pedidos enviados
          </Link>
          .
        </p>

        {esvaziada ? (
          <div className={css({ mt: "10" })}>
            <p role="status" className={css({ fontSize: "md", color: "escuro" })}>
              Sacola esvaziada.
            </p>
            <Link href="/" className={cx(botaoContorno, css({ mt: "4" }))}>
              Voltar para a loja
            </Link>
          </div>
        ) : (
          <div className={css({ mt: "10" })}>
            <p className={css({ fontSize: "md", fontWeight: "medium", color: "escuro" })}>E a sua sacola?</p>
            <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>
              Pode esvaziar agora ou manter as peças até fechar tudo com a vendedora.
            </p>
            <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "4" })}>
              <button
                type="button"
                onClick={() => {
                  esvaziarCarrinho();
                  setEsvaziada(true);
                }}
                className={botaoEscuro}
              >
                Esvaziar a sacola
              </button>
              <Link href="/carrinho" className={botaoContorno}>
                Manter a sacola
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Vazio() {
  return (
    <div className={pagina}>
      <div className={css({ maxW: "leitura" })}>
        <h1 className={cx(tituloPagina, css({ fontSize: { base: "subtitulo", md: "4xl" } }))}>Sua sacola está vazia.</h1>
        <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "textoSuave" })}>
          Escolha as peças e volte aqui para fazer o pedido pelo WhatsApp.
        </p>
        <Link href="/pronta-entrega" className={cx(botaoEscuro, css({ mt: "8" }))}>
          Ver pronta entrega
        </Link>
      </div>
    </div>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando o pedido" className={pagina}>
      <div className={grade}>
        <div className={cx(colunaPrincipal, css({ display: "grid", gap: "4" }))}>
          <div className={cx(bloco, css({ h: "10", w: "[220px]" }))} />
          <div className={cx(bloco, css({ h: "12" }))} />
          <div className={cx(bloco, css({ h: "12" }))} />
          <div className={cx(bloco, css({ h: "12" }))} />
        </div>
        <div className={cx(colunaResumo, bloco, css({ h: "[320px]" }))} />
      </div>
    </div>
  );
}

const pagina = css({
  maxW: "sacola",
  mx: "auto",
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "6", desktop: "10" },
  pb: { base: "12", desktop: "16" },
});

const grade = css({
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: { base: "2", desktop: "5" },
  rowGap: "10",
  alignItems: "start",
});

const colunaPrincipal = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, minW: "0" });
const colunaResumo = css({
  gridColumn: { base: "1 / -1", desktop: "9 / span 4" },
  position: { desktop: "sticky" },
  top: "6",
  minW: "0",
});

const formulario = css({ display: "grid", gap: "6", mt: "8", maxW: "[560px]" });

const seloPix = css({
  display: "inline-flex",
  px: "2",
  py: "0.5",
  borderRadius: "pilula",
  bg: "alertaSuave",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
});

const bloco = css({ bg: "placeholder", borderRadius: "md", animation: "pulsar" });
