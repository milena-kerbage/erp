"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ArrowsClockwise, ChatsCircle, Tag, Truck, WhatsappLogo } from "@/loja/componentes/icones";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { resolverItem } from "@/loja/lib/carrinho/linhas";
import { ConviteCupom } from "@/loja/componentes/conta/ConviteCupom";
import { type ContaDoCupom, cupomDaSacola, useContaDoCupom } from "@/loja/componentes/conta/cupomSacola";
import {
  type Cupom,
  calcularTotais,
  DESCONTO_PIX_PERCENTUAL,
  MAX_PARCELAS,
  PARCELA_MINIMA_CENTAVOS,
  PRODUCAO_ENCOMENDA,
  PRODUCAO_PRONTA,
  PRODUCAO_PROJETO,
  prazoDeProducao,
  textoPrazo,
} from "@/loja/lib/carrinho/totais";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import { CarrosselSacola } from "./CarrosselSacola";
import { DicaInfo } from "./DicaInfo";
import { Dialogo } from "./Dialogo";
import {
  adicionarAoCarrinho,
  alterarQuantidade,
  atualizarItem,
  chaveItem,
  type ItemCarrinho,
  migrarSelecaoAntiga,
  type PreferenciasCompra,
  removerDoCarrinho,
  restaurarNoCarrinho,
  salvarNosFavoritos,
  salvarPreferenciasCompra,
  tirarDosFavoritos,
  useFavoritos,
  useItensCarrinho,
  usePreferenciasCompra,
} from "./estado";
import { botaoContorno, botaoEscuro, largo, linkAcao, tituloBloco, tituloPagina } from "./estilos";
import { FotoItem } from "./FotoItem";
import { atributosDe, ItemSacola } from "./ItemSacola";
import { type AlvoEdicao, PainelEditar, personalizacaoPadrao } from "./PainelEditar";
import { reais, SeletorCupom } from "./Resumo";

// salvo: o item foi para os favoritos; novoFavorito: desfazer também o tira dos favoritos.
type Desfazer = { item: ItemCarrinho; posicao: number; nome: string; salvo: boolean; novoFavorito: boolean };
type Remocao = { item: ItemCarrinho; produto: ProdutoCarrinho };

// Contas da sacola (pura): linhas, cupom e totais "a partir de". A loja é um catálogo
// com preço e o pedido segue pelo WhatsApp: frete e prazo de entrega são combinados com o ateliê,
// então não entram aqui; o prazo de PRODUÇÃO (pronta entrega x sob encomenda x projeto) continua.
// Produtos, projetos de quarto e o quartinho personalizado ficam na mesma sacola (resolverItem).
// Cupom: o escolhido ou, com conta, o de primeira compra aplicado sozinho (cupomDaSacola; o servidor confere).
function calcular(itens: ItemCarrinho[], porSlug: Map<string, ProdutoCarrinho>, preferencias: PreferenciasCompra, contaCupom: ContaDoCupom, cupons: Cupom[]) {
  const resolvidos = itens.map((item) => ({ item, produto: resolverItem(item, porSlug) }));
  const linhas = resolvidos.flatMap(({ item, produto }) => (produto ? [{ item, produto }] : []));
  const indisponiveis = resolvidos.flatMap(({ item, produto }) => (produto ? [] : [item]));
  const precos = linhas.map(({ item, produto }) => ({ preco: produto.preco, quantidade: item.quantidade }));
  const escolhido = cupomDaSacola(preferencias, contaCupom, calcularTotais(precos).subtotal, cupons);
  const cupom = escolhido.cupom;
  const totais = calcularTotais(precos, cupom);
  const producao = prazoDeProducao(linhas.map(({ produto }) => produto));
  return { linhas, indisponiveis, cupom, totais, producao, boasVindas: escolhido.boasVindas };
}

const contagem = (quantidade: number) => `${quantidade} ${quantidade === 1 ? "item" : "itens"}`;

// Sacola no modelo da shop.lululemon.com (lululemon-sacola.md): cabeçalho com "Sacola", entrega e o
// aviso de que as peças não ficam reservadas; itens (colunas 1–7) e resumo fixo (9–12) a partir de
// 992; faixa do cupom (no lugar do vale-presente); itens salvos (favoritos). Nossas funcionalidades entram na
// mesma estrutura: prazo de produção, cupons, desfazer, bordado, 5% OFF no Pix.
// A loja é um CATÁLOGO COM PREÇO: valores "a partir de", frete e prazo de entrega combinados pelo
// WhatsApp e o botão leva ao pedido (/checkout), que abre a conversa com o ateliê. O cupom segue em
// `usePreferenciasCompra`. Itens no navegador até o carrinho existir na API.
export function PaginaCarrinho({ catalogo, maisVendidos, cupons }: { catalogo: ProdutoCarrinho[]; maisVendidos: string[]; cupons: Cupom[] }) {
  const itens = useItensCarrinho();
  const favoritos = useFavoritos();
  const preferencias = usePreferenciasCompra();
  const contaCupom = useContaDoCupom();
  const [avisoCupom, setAvisoCupom] = useState("");
  const porSlug = useMemo(() => new Map(catalogo.map((produto) => [produto.slug, produto])), [catalogo]);
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null);
  const [remocao, setRemocao] = useState<Remocao | null>(null);
  const [edicao, setEdicao] = useState<AlvoEdicao | null>(null);
  const [cupomAberto, setCupomAberto] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const temporizador = useRef<number | undefined>(undefined);
  const titulo = useRef<HTMLHeadingElement>(null);
  const router = useRouter();

  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  // Projetos da antiga "seleção de projetos" (mk_projetos) entram na sacola na primeira visita.
  useEffect(() => migrarSelecaoAntiga(), []);

  if (itens === null) return <Esqueleto />;

  const conta = calcular(itens, porSlug, preferencias, contaCupom, cupons);
  const { linhas, totais, cupom } = conta;
  const vazia = linhas.length === 0;
  const noCarrinho = new Set(linhas.flatMap(({ item, produto }) => (produto.tipo ? [] : [item.slug])));
  const salvos = favoritos.filter((slug) => !noCarrinho.has(slug)).flatMap((slug) => porSlug.get(slug) ?? []);
  const escolher = (slugs: string[], fora: Set<string>, quantidade: number) =>
    [...new Set(slugs)]
      .filter((slug) => !fora.has(slug))
      .flatMap((slug) => porSlug.get(slug) ?? [])
      .slice(0, quantidade);
  // Vitrine: o mix das peças da sacola ("Complete o enxoval"); vazia, os mais vendidos.
  const vitrine = vazia
    ? escolher(maisVendidos, noCarrinho, 8)
    : escolher([...linhas.flatMap(({ produto }) => [...produto.complementos, ...produto.semelhantes]), ...maisVendidos], noCarrinho, 8);

  function avisar(mensagem: string) {
    setAnuncio(mensagem);
  }

  function mudarQuantidade(item: ItemCarrinho, nome: string, quantidade: number) {
    alterarQuantidade(item, quantidade);
    const depois = calcular(
      (itens ?? []).map((atual) => (atual === item ? { ...atual, quantidade } : atual)),
      porSlug,
      preferencias,
      contaCupom,
      cupons,
    );
    avisar(`Quantidade de ${nome}: ${quantidade}. Total a partir de ${reais(depois.totais.totalCartao)}.`);
  }

  function tirar(item: ItemCarrinho, nome: string, salvo = false, novoFavorito = false) {
    const posicao = removerDoCarrinho(item);
    setDesfazer({ item, posicao, nome, salvo, novoFavorito });
    avisar(salvo ? `${nome} foi para os favoritos.` : `${nome} saiu da sacola.`);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setDesfazer(null), 6000);
    // O botão que abriu a ação some com o item: o foco vai para o título da página.
    window.requestAnimationFrame(() => titulo.current?.focus({ preventScroll: true }));
  }

  function salvarParaDepois(item: ItemCarrinho, nome: string) {
    const novoFavorito = !favoritos.includes(item.slug);
    salvarNosFavoritos(item.slug);
    tirar(item, nome, true, novoFavorito);
  }

  function moverParaSacola(produto: ProdutoCarrinho) {
    const item: ItemCarrinho = {
      slug: produto.slug,
      quantidade: 1,
      ...(produto.personalizacao ? { personalizacao: personalizacaoPadrao(produto) } : {}),
    };
    // Peça com tamanho obrigatório: escolhe no painel antes de ir para a sacola.
    if (produto.opcoes && produto.opcoes.length > 0) return setEdicao({ modo: "mover", item });
    adicionarAoCarrinho(item);
    tirarDosFavoritos(produto.slug);
    avisar(`${produto.nome} foi para a sacola.`);
  }

  function salvarEdicao(alvo: AlvoEdicao, novo: ItemCarrinho) {
    const nome = resolverItem(novo, porSlug)?.nome ?? "Item";
    if (alvo.modo === "mover") {
      adicionarAoCarrinho(novo);
      tirarDosFavoritos(alvo.item.slug);
      avisar(`${nome} foi para a sacola.`);
    } else {
      atualizarItem(alvo.item, novo);
      avisar(`${nome} atualizado.`);
    }
    // Mudou a linha (outra cor, tamanho ou bordado) ou o favorito saiu da lista: o botão que abriu o
    // painel não existe mais, então o foco vai para o título (depois do close() do diálogo).
    const mesmaLinha = alvo.modo === "editar" && chaveItem(alvo.item) === chaveItem(novo);
    if (!mesmaLinha) window.setTimeout(() => titulo.current?.focus({ preventScroll: true }), 50);
  }

  return (
    <>
      <div className={pagina}>
        {conta.indisponiveis.length > 0 && (
          <div role="alert" className={avisoIndisponivel}>
            <p>
              {conta.indisponiveis.length === 1
                ? "1 item não está mais disponível e ficou fora do total."
                : `${conta.indisponiveis.length} itens não estão mais disponíveis e ficaram fora do total.`}
            </p>
            <button type="button" onClick={() => conta.indisponiveis.forEach(removerDoCarrinho)} className={linkAcao}>
              Remover
            </button>
          </div>
        )}

        {vazia ? (
          <div className={grade}>
            <section aria-labelledby="titulo-sacola" className={vazioEstilo}>
              <h1 id="titulo-sacola" ref={titulo} tabIndex={-1} className={cx(tituloPagina, css({ fontSize: { base: "subtitulo", md: "4xl" } }))}>
                Sua sacola está esperando por você.
              </h1>
              <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "textoSuave" })}>
                Peças a pronta entrega saem do ateliê em até {textoPrazo(PRODUCAO_PRONTA)}. Em Fortaleza, dá para retirar no ateliê.
              </p>
              <Link href="/pronta-entrega" className={cx(botaoEscuro, largo, css({ mt: "8" }))}>
                Ver pronta entrega
              </Link>
            </section>
            <ItensSalvos salvos={salvos} aoMover={moverParaSacola} aoRemover={(produto) => tirarDosFavoritos(produto.slug)} />
          </div>
        ) : (
          <div className={grade}>
            <header className={cabecalhoPagina}>
              <div className={css({ gridColumn: "1 / -1", display: "flex", alignItems: "baseline", gap: { base: "2", md: "4" } })}>
                <h1 id="titulo-sacola" ref={titulo} tabIndex={-1} className={tituloPagina}>
                  Sacola
                </h1>
                <p className={css({ fontSize: "xs", color: "textoSuave" })}>{contagem(totais.itens)}</p>
              </div>

              <section aria-labelledby="titulo-entrega" className={cx(colunaCabecalho, css({ display: "flex", gap: "3", alignItems: "flex-start" }))}>
                <Truck size={24} aria-hidden className={css({ flexShrink: "0", color: "escuro" })} />
                <div className={css({ minW: "0" })}>
                  <h2 id="titulo-entrega" className={css({ fontSize: "md", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>
                    Entrega para todo o Brasil
                  </h2>
                  <p className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
                    O frete e o prazo de entrega são combinados com o ateliê pelo WhatsApp, no seu pedido. Em Fortaleza, dá
                    para retirar no ateliê.
                  </p>
                </div>
              </section>

              <div role="note" className={cx(colunaCabecalho, avisoReserva)}>
                <p className={css({ fontWeight: "medium", color: "escuro" })}>As peças não ficam reservadas</p>
                <p>Faça o pedido pelo WhatsApp para garantir as suas: as peças a pronta entrega podem esgotar.</p>
              </div>
            </header>

            <section aria-labelledby="titulo-sacola" className={colunaItens}>
              <ul aria-label="Itens da sacola">
                {linhas.map(({ item, produto }) => (
                  <ItemSacola
                    key={chaveItem(item)}
                    item={item}
                    produto={produto}
                    aoMudarQuantidade={(quantidade) => mudarQuantidade(item, produto.nome, quantidade)}
                    aoRemover={() => setRemocao({ item, produto })}
                    // O quartinho personalizado volta ao montador com as escolhas; o resto edita na gaveta.
                    aoEditar={() => (produto.tipo === "personalizado" && produto.href ? router.push(produto.href) : setEdicao({ modo: "editar", item }))}
                    aoSalvar={produto.tipo ? undefined : () => salvarParaDepois(item, produto.nome)}
                  />
                ))}
              </ul>

              <div className={css({ display: "grid", gap: "3", mt: "8" })}>
                <div className={faixa}>
                  <span aria-hidden className={iconeFaixa}>
                    <Tag size={20} />
                  </span>
                  {cupom ? (
                    <p>
                      {conta.boasVindas ? "Seu cupom de primeira compra" : "Cupom"} <strong className={css({ fontWeight: "medium" })}>{cupom.codigo}</strong>{" "}
                      {totais.descontoCupom > 0 ? `aplicado: − ${reais(totais.descontoCupom)}.` : "ainda não vale para este valor."}{" "}
                      <button type="button" aria-haspopup="dialog" onClick={() => setCupomAberto(true)} className={linkAcao}>
                        Trocar ou remover
                      </button>
                    </p>
                  ) : (
                    <p>
                      Tem um cupom?{" "}
                      <button type="button" aria-haspopup="dialog" onClick={() => setCupomAberto(true)} className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                        Use aqui
                      </button>
                    </p>
                  )}
                </div>
                {avisoCupom && (
                  <p role="status" className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
                    {avisoCupom}
                  </p>
                )}
                {contaCupom.pronta && !contaCupom.logada && (
                  <ConviteCupom
                    variante="faixa"
                    acao={
                      <Link href="/conta/cadastro?voltar=/carrinho" className={cx(linkAcao, css({ fontWeight: "medium" }))}>
                        Criar conta
                      </Link>
                    }
                  >
                    O cupom é exclusivo da sua conta e entra sozinho na sacola. Já tem conta?{" "}
                    <Link href="/conta/entrar?voltar=/carrinho" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                      Entrar
                    </Link>
                  </ConviteCupom>
                )}
              </div>
            </section>

            <ResumoSacola conta={conta} />

            <ItensSalvos salvos={salvos} aoMover={moverParaSacola} aoRemover={(produto) => tirarDosFavoritos(produto.slug)} />
          </div>
        )}
      </div>

      <CarrosselSacola
        id="titulo-vitrine-sacola"
        titulo={vazia ? "Mais vendidos" : "Complete o enxoval"}
        produtos={vitrine}
      />

      {!vazia && <BarraFinalizar total={reais(totais.totalCartao)} itens={totais.itens} />}

      <Dialogo aberto={remocao !== null} aoFechar={() => setRemocao(null)} titulo="Remover este item da sacola?">
        {remocao && (
          <>
            <div className={css({ display: "flex", gap: "4", alignItems: "flex-start" })}>
              <FotoItem produto={remocao.produto} sizes="80px" className={css({ w: "20", aspectRatio: "[5 / 6]" })} />
              <div className={css({ minW: "0", fontSize: "sm", lineHeight: "texto" })}>
                <p className={css({ color: "escuro" })}>{remocao.produto.nome}</p>
                {atributosDe(remocao.produto, remocao.item).map((linha) => (
                  <p key={linha} className={css({ fontSize: "xs", color: "textoSuave" })}>
                    {linha}
                  </p>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const alvo = remocao;
                setRemocao(null);
                tirar(alvo.item, alvo.produto.nome);
              }}
              className={cx(botaoContorno, largo, css({ mt: "6" }))}
            >
              Remover
            </button>
            {!remocao.produto.tipo && (
              <div className={css({ mt: "4", textAlign: "center" })}>
                <button
                  type="button"
                  onClick={() => {
                    const alvo = remocao;
                    setRemocao(null);
                    salvarParaDepois(alvo.item, alvo.produto.nome);
                  }}
                  className={linkAcao}
                >
                  Salvar nos favoritos
                </button>
              </div>
            )}
          </>
        )}
      </Dialogo>

      {edicao && (
        <PainelEditar
          key={`${edicao.modo}-${chaveItem(edicao.item)}`}
          alvo={edicao}
          porSlug={porSlug}
          aoFechar={() => setEdicao(null)}
          aoSalvar={salvarEdicao}
        />
      )}

      <Dialogo aberto={cupomAberto} aoFechar={() => setCupomAberto(false)} titulo="Cupom de desconto">
        <SeletorCupom
          cupom={cupom}
          subtotal={totais.subtotal}
          desconto={totais.descontoCupom}
          conta={contaCupom}
          cupons={cupons}
          abertoInicial
          aoMudar={(codigo, aviso) => {
            setAvisoCupom(aviso ?? "");
            if (codigo) {
              salvarPreferenciasCompra({ cupom: codigo, semCupomAutomatico: undefined });
              setCupomAberto(false);
              avisar(aviso ?? `Cupom ${codigo} aplicado.`);
            } else {
              // Tirar o de primeira compra (aplicado sozinho): ele fica guardado para outro pedido.
              salvarPreferenciasCompra({ cupom: undefined, ...(conta.boasVindas ? { semCupomAutomatico: true } : {}) });
              avisar(conta.boasVindas ? "Cupom de primeira compra removido deste pedido. Ele continua guardado na sua conta." : "Cupom removido.");
            }
          }}
        />
      </Dialogo>

      {desfazer && (
        <div className={avisoDesfazer}>
          <span className={css({ minW: "0", truncate: true })}>
            {desfazer.nome} {desfazer.salvo ? "foi para os favoritos." : "saiu da sacola."}
          </span>
          <button
            type="button"
            onClick={() => {
              restaurarNoCarrinho(desfazer.item, desfazer.posicao);
              if (desfazer.novoFavorito) tirarDosFavoritos(desfazer.item.slug);
              avisar(`${desfazer.nome} voltou para a sacola.`);
              setDesfazer(null);
            }}
            className={css({ flexShrink: "0", fontWeight: "medium", textDecoration: "underline", textUnderlineOffset: "[4px]", cursor: "pointer" })}
          >
            Desfazer
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className={css({ srOnly: true })}>
        {anuncio}
      </p>
    </>
  );
}

type Conta = ReturnType<typeof calcular>;

// Resumo do pedido (lululemon-sacola.md §6): linhas de 14, total em 16/500 e o botão escuro em pílula
// de 44. Catálogo com preço: valores "a partir de", frete a combinar, 5% OFF no Pix (sem calcular) e
// o pedido segue pelo WhatsApp (/checkout monta a mensagem). Nada é cobrado no site.
function ResumoSacola({ conta }: { conta: Conta }) {
  const elemento = useRef<HTMLElement>(null);
  const top = useTopoFixo(elemento, 24);
  const { totais, cupom, producao } = conta;

  return (
    <aside ref={elemento} id="resumo" aria-labelledby="titulo-resumo" className={resumo} style={{ top }}>
      <h2 id="titulo-resumo" className={tituloBloco}>
        Resumo do pedido
      </h2>
      <dl className={css({ display: "grid", gap: "3", mt: "6", fontSize: "sm", lineHeight: "texto" })}>
        <Linha rotulo={`Subtotal (${contagem(totais.itens)})`} valor={`a partir de ${reais(totais.subtotal)}`} />
        {cupom && totais.descontoCupom > 0 && <Linha rotulo={`Desconto do cupom ${cupom.codigo}`} valor={`− ${reais(totais.descontoCupom)}`} destaque />}
        <Linha
          rotulo={
            <>
              Frete{" "}
              <DicaInfo rotulo="Como funciona o frete">
                O frete e o prazo de entrega são combinados com uma vendedora do ateliê pelo WhatsApp, quando você fizer o pedido:
                ela cota pelo seu CEP e confirma tudo antes do pagamento. Em Fortaleza, dá para retirar no ateliê.
              </DicaInfo>
            </>
          }
          valor="A combinar pelo WhatsApp"
        />
        <Linha
          rotulo={
            <>
              Produção{" "}
              <DicaInfo rotulo="Como funciona o prazo de produção">
                Peças a pronta entrega saem do ateliê em até {textoPrazo(PRODUCAO_PRONTA)}; as feitas sob encomenda (costura e
                bordado) levam de {textoPrazo(PRODUCAO_ENCOMENDA)}, e os quartinhos personalizados, de {textoPrazo(PRODUCAO_PROJETO)}. O
                pedido sai inteiro, então vale o prazo da peça mais demorada. O prazo de entrega é combinado pelo WhatsApp.
              </DicaInfo>
            </>
          }
          valor={`${producao === PRODUCAO_PRONTA ? "até " : ""}${textoPrazo(producao)}`}
        />
      </dl>

      <div aria-live="polite" aria-atomic="true" className={css({ mt: "4", pt: "4", borderTopWidth: "1px", borderColor: "borda" })}>
        <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "3", color: "escuro" })}>
          <span className={css({ fontSize: "md", fontWeight: "medium" })}>Total estimado</span>
          <span className={css({ textAlign: "right" })}>
            <span className={css({ fontSize: "sm", color: "textoSuave" })}>a partir de </span>
            <span className={css({ fontSize: "md", fontWeight: "medium" })}>{reais(totais.totalCartao)}</span>
          </span>
        </div>
        <p className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", mt: "2", fontSize: "xs", color: "textoSuave" })}>
          <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
          Sem o frete. O ateliê confirma os valores no WhatsApp.
        </p>
      </div>

      <div className={css({ mt: { base: "8", desktop: "10" } })}>
        <Link id="finalizar-resumo" href="/checkout" className={cx(botaoEscuro, largo)}>
          <WhatsappLogo size={20} aria-hidden /> Fazer pedido pelo WhatsApp
        </Link>
      </div>

      <p className={css({ mt: "4", fontSize: "sm", lineHeight: "texto", color: "textoSuave", textAlign: "center" })}>
        {totais.parcelas > 1 ? `ou em até ${totais.parcelas}x sem juros no cartão` : "Pix ou cartão de crédito"}{" "}
        <DicaInfo rotulo="Como funciona o pagamento" alinhar="centro">
          Nada é cobrado no site. Uma vendedora do ateliê continua o pedido pelo WhatsApp e combina o pagamento: Pix com{" "}
          {DESCONTO_PIX_PERCENTUAL}% OFF nos produtos ou cartão de crédito em até {MAX_PARCELAS}x sem juros (parcela mínima de{" "}
          {reais(PARCELA_MINIMA_CENTAVOS)}).
        </DicaInfo>
      </p>

      <ul className={css({ display: "grid", gap: "2", mt: "6", fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
        <li className={selo}>
          <ChatsCircle size={16} aria-hidden /> Atendimento de uma vendedora do ateliê pelo WhatsApp
        </li>
        {/* [CONFIRMAR] com o jurídico: arrependimento em 7 dias (CDC, art. 49); peça bordada só troca por defeito. */}
        <li className={selo}>
          <ArrowsClockwise size={16} aria-hidden /> Troca ou devolução em até 7 dias (peças sem bordado)
        </li>
      </ul>
      <p className={css({ mt: "4", fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
        Montando o quarto inteiro?{" "}
        <Link href="/personalizado" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
          Conheça os quartinhos
        </Link>{" "}
        ou{" "}
        <Link href="/personalizado/monte-o-seu" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
          monte o seu quartinho
        </Link>
        .
      </p>
    </aside>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: ReactNode; valor: string; destaque?: boolean }) {
  return (
    <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "3" })}>
      <dt className={css({ color: "texto" })}>{rotulo}</dt>
      <dd className={css({ color: destaque ? "sucesso" : "escuro", textAlign: "right" })}>{valor}</dd>
    </div>
  );
}

// Gruda a `desejado` px do topo; se o resumo for mais alto que a tela, gruda pela base.
function useTopoFixo(alvo: RefObject<HTMLElement | null>, desejado: number): number {
  const [topo, setTopo] = useState(desejado);
  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;
    const medir = () => setTopo(Math.min(desejado, window.innerHeight - elemento.offsetHeight - desejado));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [alvo, desejado]);
  return topo;
}

// Itens salvos (lululemon-sacola.md §7): os favoritos, com "Mover para a sacola" e "Remover".
function ItensSalvos({
  salvos,
  aoMover,
  aoRemover,
}: {
  salvos: ProdutoCarrinho[];
  aoMover: (produto: ProdutoCarrinho) => void;
  aoRemover: (produto: ProdutoCarrinho) => void;
}) {
  return (
    <section aria-labelledby="titulo-salvos" className={colunaSalvos}>
      <h2 id="titulo-salvos" className={tituloSalvos}>
        Itens salvos
      </h2>
      {salvos.length === 0 ? (
        <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "texto", maxW: "leitura" })}>
          Ainda não há peças salvas. Toque em <strong className={css({ fontWeight: "medium" })}>Salvar nos favoritos</strong> numa peça
          da sacola, ou no coração da página de produto, para guardar para depois.
        </p>
      ) : (
        <ul className={gradeSalvos}>
          {salvos.map((produto) => (
            <li key={produto.slug} className={cx("group", css({ display: "flex", flexDirection: "column", minW: "0" }))}>
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
              <button type="button" onClick={() => aoMover(produto)} className={cx(botaoContorno, largo, css({ mt: "auto", px: "3" }))}>
                Mover para a sacola
              </button>
              <button type="button" onClick={() => aoRemover(produto)} className={cx(linkAcao, css({ mt: "3", alignSelf: "center" }))}>
                Remover <span className={css({ srOnly: true })}>{produto.nome} dos favoritos</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Celular e tablet: quando o botão do resumo sai da tela, sobe uma barra fixa com o total "a partir
// de" e o pedido pelo WhatsApp, em pílula.
function BarraFinalizar({ total, itens }: { total: string; itens: number }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const botao = document.getElementById("finalizar-resumo");
    if (!botao) return;
    const observador = new IntersectionObserver(([entrada]) => setVisivel(!entrada.isIntersecting));
    observador.observe(botao);
    return () => observador.disconnect();
  }, []);

  return (
    <div data-barra-fixa data-visivel={visivel || undefined} aria-hidden={!visivel} inert={!visivel} className={barraCelular}>
      <p className={css({ minW: "0" })}>
        <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>{contagem(itens)} · a partir de</span>
        <span className={css({ display: "block", fontSize: "lg", fontWeight: "medium", color: "escuro" })}>{total}</span>
      </p>
      <Link href="/checkout" aria-label="Fazer pedido pelo WhatsApp" className={botaoEscuro}>
        <WhatsappLogo size={20} aria-hidden /> Fazer pedido
      </Link>
    </div>
  );
}

// Carregamento (lululemon-sacola.md §1): blocos cinza que pulsam no lugar do título, da faixa e de
// cada item (foto à esquerda, duas linhas à direita) e do resumo.
function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando a sacola" className={pagina}>
      <div className={grade}>
        <div className={cabecalhoPagina}>
          <div className={cx(bloco, css({ gridColumn: "1 / -1", w: "[160px]", h: "10" }))} />
          <div className={cx(bloco, colunaCabecalho, css({ h: "16" }))} />
          <div className={cx(bloco, colunaCabecalho, css({ h: "16" }))} />
        </div>
        <div className={colunaItens}>
          {[1, 2].map((item) => (
            <div key={item} className={cx(esqueletoItem)}>
              <div className={cx(bloco, css({ aspectRatio: "[5 / 6]" }))} />
              <div className={css({ display: "grid", gap: "3", alignContent: "start" })}>
                <div className={cx(bloco, css({ h: "4", w: "[80%]" }))} />
                <div className={cx(bloco, css({ h: "4", w: "[50%]" }))} />
              </div>
            </div>
          ))}
        </div>
        <div className={cx(resumo, css({ display: "grid", gap: "4", alignContent: "start" }))}>
          <div className={cx(bloco, css({ h: "8", w: "[60%]" }))} />
          <div className={cx(bloco, css({ h: "24" }))} />
          <div className={cx(bloco, css({ h: "11", borderRadius: "pilula" }))} />
        </div>
      </div>
    </div>
  );
}

// Contêiner (§2): até 1440, margens 12/20/40, 40 do cabeçalho.
const pagina = css({
  maxW: "sacola",
  mx: "auto",
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "6", desktop: "10" },
  pb: { base: "10", desktop: "16" },
});

// Grade de 12 colunas (§2): cabeçalho, itens e salvos nas colunas 1–7 e resumo fixo nas 9–12 a partir
// de 992 (uma coluna de respiro entre eles); no celular, tudo empilhado.
const grade = css({
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: { base: "2", desktop: "5" },
  rowGap: { base: "8", desktop: "8" },
  alignItems: "start",
});

// Cabeçalho da página nas colunas dos itens (1–7): o resumo sobe até o topo, ao lado dele.
const cabecalhoPagina = css({
  gridColumn: { base: "1 / -1", desktop: "1 / span 7" },
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: { base: "2", desktop: "5" },
  rowGap: { base: "4", desktop: "6" },
});

const colunaCabecalho = css({ gridColumn: "1 / -1" });
const colunaItens = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, minW: "0" });
const colunaSalvos = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, minW: "0", mt: { base: "8", desktop: "16" } });

const resumo = css({
  gridColumn: { base: "1 / -1", desktop: "9 / span 4" },
  gridRow: { desktop: "1 / span 3" },
  position: { desktop: "sticky" },
  alignSelf: "start",
  minW: "0",
});

const avisoReserva = css({
  display: "grid",
  gap: "1",
  px: "4",
  py: "3",
  borderRadius: "md",
  bg: "alertaSuave",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
});

const avisoIndisponivel = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  mb: "6",
  px: "4",
  py: "3",
  borderRadius: "md",
  bg: "alertaSuave",
  fontSize: "sm",
  color: "erro",
});

// Faixa do vale-presente (§5): cartão suave, cantos de 12, ícone em quadrado escuro e texto de 16.
const faixa = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  px: "4",
  py: "3",
  borderRadius: "lg",
  bg: "fundoSutil",
  fontSize: { base: "sm", md: "md" },
  lineHeight: "texto",
  color: "escuro",
});

const iconeFaixa = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "md",
  bg: "escuro",
  color: "fundo",
});

const tituloSalvos = css({
  fontSize: { base: "subtitulo", desktop: "bloco" },
  fontWeight: "normal",
  lineHeight: "bloco",
  letterSpacing: "titulo",
  color: "escuro",
});

const gradeSalvos = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
  columnGap: { base: "2", md: "5" },
  rowGap: "8",
  mt: "6",
});

const vazioEstilo = css({ gridColumn: { base: "1 / -1", md: "1 / span 8", desktop: "1 / span 5" } });

const selo = css({ display: "flex", alignItems: "center", gap: "2" });

// "5% OFF no Pix": selo quente claro, sem calcular o valor.
const seloPix = css({
  display: "inline-flex",
  alignItems: "center",
  px: "2",
  py: "0.5",
  borderRadius: "pilula",
  bg: "alertaSuave",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
});

const barraCelular = css({
  position: "fixed",
  insetX: "0",
  bottom: "0",
  zIndex: "barraSacola",
  display: { base: "flex", desktop: "none" },
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  px: "3",
  pt: "3",
  pb: "[calc(12px + env(safe-area-inset-bottom))]",
  bg: "fundo",
  borderTopWidth: "1px",
  borderColor: "borda",
  transform: "translateY(110%)",
  transitionProperty: "transform",
  transitionDuration: "gaveta",
  transitionTimingFunction: "assinatura",
  "&[data-visivel]": { transform: "none" },
});

const avisoDesfazer = css({
  position: "fixed",
  left: "[50%]",
  translate: "[-50% 0]",
  bottom: { base: "[calc(88px + env(safe-area-inset-bottom))]", desktop: "6" },
  zIndex: "avisoSacola",
  display: "flex",
  alignItems: "center",
  gap: "4",
  maxW: "[calc(100vw - 24px)]",
  px: "5",
  py: "3",
  borderRadius: "pilula",
  bg: "escuro",
  color: "fundo",
  fontSize: "sm",
  boxShadow: "media",
  animation: "surgir",
});

const bloco = css({ bg: "placeholder", borderRadius: "md", animation: "pulsar" });

const esqueletoItem = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", desktop: "minmax(token(sizes.fotoSacola), 3fr) minmax(0, 9fr)" },
  columnGap: { base: "2", desktop: "5" },
  py: "5",
  borderBottomWidth: "1px",
  borderColor: "borda",
});
