"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ConfirmacaoCarrinho, type Sugestao } from "@/loja/componentes/carrinho/ConfirmacaoCarrinho";
import { adicionarAoCarrinho, atualizarItem, type ItemCarrinho, useItensCarrinho } from "@/loja/componentes/carrinho/estado";
import { botaoContorno, largo, linkAcao } from "@/loja/componentes/carrinho/estilos";
import { Selecao } from "@/loja/componentes/checkout/Campo";
import { ArrowCounterClockwise, CaretRight, Check, Info, Plus, WhatsappLogo } from "@/loja/componentes/icones";
import { DESCONTO_PIX_PERCENTUAL, decimal, PRODUCAO_PROJETO, textoPrazo } from "@/loja/lib/carrinho/totais";
import { buscarProjeto, formatarPreco, listarProjetos } from "@/loja/lib/casas/catalogo";
import {
  alternarModulo,
  bordadoLimpo,
  buscarModulo,
  buscarPaleta,
  contagemDoGrupo,
  type ErrosQuartinho,
  escolherOpcao,
  GRUPOS_MODULOS,
  idQuartinho,
  incluido,
  LIMITE_BORDADO,
  linhasDoQuartinho,
  type Modulo,
  modulosDoGrupo,
  nomeDoQuartinho,
  normalizarQuartinho,
  opcoesCompletas,
  PRECO_BORDADO,
  type Paleta,
  paletasDoTema,
  precoDoModulo,
  precoDoQuartinho,
  type Quartinho,
  quartinhoDoProjeto,
  quartinhoVazio,
  TAMANHOS_BERCO,
  TEMAS,
  temPecasDeBerco,
  validarQuartinho,
} from "@/loja/lib/casas/modulos";
import { AvisoDemonstracao } from "./AvisoDemonstracao";
import {
  amostra,
  amostras,
  botaoCompra,
  botaoOpcaoLargo,
  circulo,
  divisoria,
  linhaRotulo,
  linkTrilha,
  mensagemErro,
  parcelamento,
  precoBotao,
  rotulo,
  rotuloBotao,
  seloPix,
  valor,
} from "./estilosPainel";
import { FotoProjeto, tomDaPaleta } from "./FotoProjeto";

// "Monte o seu quartinho" (/projetos/monte-o-seu): o projeto personalizado, numa página só, no padrão
// da sacola (itens nas colunas 1–7 e resumo fixo nas 9–12; no celular, empilhado com a barra fixa) e
// com os controles da página de produto (botões de 44, bolinhas 44/36, botão escuro com o preço):
//   1. Tema e paleta (ou partir de um projeto do ateliê, que pré-preenche tudo);
//   2. Peças em grupos (Berço · Quarto · Banho e passeio · Maternidade) com "3 de 6 escolhidos": cada
//      módulo com foto 5:6 nos tons da paleta, "a partir de", opções e "Incluir/Remover";
//   3. Bordado do nome (opcional);
//   4. Resumo com a prévia do conjunto, a lista, o total "a partir de", 5% OFF no Pix e frete a
//      combinar, e os botões "Adicionar no meu enxoval" e "Fazer pedido pelo WhatsApp".
// As regras (preço, validação, item da sacola) ficam em lib/casas/modulos.ts. O rascunho fica no
// navegador (mk_montador) para não perder o progresso. Com ?projeto=<slug>, começa do projeto; com
// ?editar=<id>, edita o quartinho que já está na sacola.

const RASCUNHO = "mk_montador";

type Rascunho = { quartinho: Quartinho; comBordado: boolean };

function lerRascunho(): Rascunho | null {
  try {
    const bruto = window.localStorage.getItem(RASCUNHO);
    if (!bruto) return null;
    const valor = JSON.parse(bruto);
    return { quartinho: normalizarQuartinho(valor?.quartinho), comBordado: Boolean(valor?.comBordado) };
  } catch {
    return null;
  }
}

function gravarRascunho(rascunho: Rascunho | null) {
  try {
    if (rascunho) window.localStorage.setItem(RASCUNHO, JSON.stringify(rascunho));
    else window.localStorage.removeItem(RASCUNHO);
  } catch {
    // sem storage: segue sem rascunho
  }
}

const vazio = (quartinho: Quartinho) => !quartinho.tema && !quartinho.paleta && quartinho.modulos.length === 0 && !quartinho.tamanhoBerco;

const ORDEM_ERROS = ["paleta", "modulos", "tamanhoBerco", "bordado"] as const;
const ETAPA_DO_ERRO: Record<(typeof ORDEM_ERROS)[number], string> = {
  paleta: "etapa-tema",
  modulos: "etapa-pecas",
  tamanhoBerco: "tamanho-berco",
  bordado: "etapa-bordado",
};

export function Montador({ sugestoes }: { sugestoes: Sugestao[] }) {
  const router = useRouter();
  const itens = useItensCarrinho();
  const [quartinho, setQuartinho] = useState<Quartinho>(quartinhoVazio());
  const [comBordado, setComBordado] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const [edicao, setEdicao] = useState<ItemCarrinho | null>(null);
  const [tentou, setTentou] = useState(false);
  const [confirmado, setConfirmado] = useState<{ nome: string; detalhe: string; preco: number; paleta?: string[] } | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const iniciado = useRef(false);

  // Ponto de partida (uma vez, depois de ler a sacola): ?editar= (quartinho da sacola), ?projeto=
  // (projeto do ateliê) ou o rascunho salvo.
  useEffect(() => {
    if (iniciado.current || itens === null) return;
    iniciado.current = true;
    const busca = new URLSearchParams(window.location.search);
    const editar = busca.get("editar");
    const projeto = buscarProjeto(busca.get("projeto") ?? "");
    const naSacola = editar ? itens.find((item) => item.tipo === "personalizado" && item.slug === editar) : undefined;
    if (naSacola?.quartinho) {
      setQuartinho(naSacola.quartinho);
      setComBordado(Boolean(naSacola.quartinho.bordado));
      setEdicao(naSacola);
    } else if (projeto) {
      setQuartinho(quartinhoDoProjeto(projeto));
    } else {
      const rascunho = lerRascunho();
      if (rascunho && !vazio(rascunho.quartinho)) {
        setQuartinho(rascunho.quartinho);
        setComBordado(rascunho.comBordado);
        setRestaurado(true);
      }
    }
    setPronto(true);
  }, [itens]);

  // Rascunho a cada mudança (fora da edição de um item da sacola, que tem o próprio "Salvar").
  useEffect(() => {
    if (!pronto || edicao) return;
    gravarRascunho(vazio(quartinho) && !comBordado ? null : { quartinho, comBordado });
  }, [quartinho, comBordado, pronto, edicao]);

  const erros: ErrosQuartinho = tentou ? validarQuartinho(quartinho, { comBordado }) : {};
  const total = precoDoQuartinho(comBordado ? quartinho : { ...quartinho, bordado: undefined });
  const paleta = buscarPaleta(quartinho.paleta);
  const cores = paleta?.cores.map((cor) => cor.hex);

  function mudar(novo: Quartinho, mensagem?: string) {
    setQuartinho(novo);
    if (mensagem) setAnuncio(mensagem);
  }

  function recomecar() {
    setQuartinho(quartinhoVazio());
    setComBordado(false);
    setTentou(false);
    setRestaurado(false);
    gravarRascunho(null);
    setAnuncio("Quartinho recomeçado.");
  }

  // Valida; com erro, leva à primeira etapa com problema (a mensagem aparece junto dela).
  function validar(): Quartinho | null {
    const final = { ...quartinho, bordado: comBordado ? bordadoLimpo(quartinho.bordado) : undefined };
    const encontrados = validarQuartinho(final, { comBordado });
    const primeiro = ORDEM_ERROS.find((chave) => encontrados[chave]);
    if (!primeiro) return final;
    setTentou(true);
    setAnuncio(`Falta pouco: ${encontrados[primeiro]}`);
    const alvo = document.getElementById(ETAPA_DO_ERRO[primeiro]);
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alvo?.scrollIntoView({ block: "center", behavior: reduzir ? "auto" : "smooth" });
    alvo?.querySelector<HTMLElement>("button, input, select")?.focus({ preventScroll: true });
    return null;
  }

  function adicionar(depois: "confirmar" | "pedido") {
    const final = validar();
    if (!final) return;
    const novo: ItemCarrinho = { tipo: "personalizado", slug: idQuartinho(final), quantidade: edicao?.quantidade ?? 1, quartinho: final };
    if (edicao) {
      // O rascunho (outro quartinho em andamento) fica como está.
      atualizarItem(edicao, novo);
      router.push(depois === "pedido" ? "/checkout" : "/carrinho");
      return;
    }
    adicionarAoCarrinho(novo);
    gravarRascunho(null);
    setRestaurado(false);
    if (depois === "pedido") {
      router.push("/checkout");
      return;
    }
    const linhas = linhasDoQuartinho(final);
    setConfirmado({
      nome: nomeDoQuartinho(final),
      detalhe: `${linhas.length} ${linhas.length === 1 ? "item" : "itens"}: ${linhas.map((linha) => linha.nome).join(", ")}`,
      preco: precoDoQuartinho(final),
      paleta: cores,
    });
  }

  const escolhidos = quartinho.modulos.length;

  return (
    <div className={pagina}>
      <div className={grade}>
        <header className={cabecalho}>
          <nav aria-label="Você está em" className={css({ fontSize: "sm", lineHeight: "texto", color: "escuro" })}>
            <ol className={css({ display: "flex", flexWrap: "wrap" })}>
              {[
                { rotulo: "Projetos", href: "/projetos" },
                { rotulo: "Monte o seu quartinho", href: "/projetos/monte-o-seu" },
              ].map((elo, indice) => (
                <li key={elo.href}>
                  {indice > 0 && (
                    <span aria-hidden className={css({ mx: "1" })}>
                      /
                    </span>
                  )}
                  <Link href={elo.href} aria-current={indice === 1 ? "page" : undefined} className={linkTrilha}>
                    {elo.rotulo}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <h1 className={tituloPagina}>
            {edicao ? "Editar o seu quartinho" : "Monte o seu quartinho"}
            <span className={css({ color: "textoSuave" })}> Projeto personalizado</span>
          </h1>
          <p className={css({ maxW: "leitura", fontSize: "md", lineHeight: "texto", color: "texto" })}>
            Escolha o tema, a paleta e as peças do quarto, uma a uma. O total &quot;a partir de&quot; aparece na hora, o quartinho vai para a sua
            sacola junto com o resto do enxoval e o pedido segue pelo WhatsApp com uma vendedora.
          </p>
          <ol aria-label="Etapas" className={indiceEtapas}>
            {[
              { href: "#etapa-tema", rotulo: "Tema e paleta", feito: Boolean(paleta) },
              { href: "#etapa-pecas", rotulo: "Peças", feito: escolhidos > 0 },
              { href: "#etapa-bordado", rotulo: "Bordado", feito: comBordado && Boolean(bordadoLimpo(quartinho.bordado)) },
              { href: "#resumo-quartinho", rotulo: "Resumo", feito: false },
            ].map((etapa, indice) => (
              <li key={etapa.href}>
                <a href={etapa.href} className={chipEtapa} data-feito={(etapa.feito && indice < 3) || undefined}>
                  <span aria-hidden className={numeroEtapa}>
                    {etapa.feito && indice < 3 ? <Check size={12} weight="bold" /> : indice + 1}
                  </span>
                  {etapa.rotulo}
                </a>
              </li>
            ))}
          </ol>
          {(restaurado || edicao) && (
            <p role="status" className={avisoRascunho}>
              <Info size={16} aria-hidden className={css({ flexShrink: "0" })} />
              <span>
                {edicao ? "Você está editando o quartinho que está na sacola." : "Continuamos de onde você parou: o rascunho fica salvo neste navegador."}
              </span>
              <button type="button" onClick={recomecar} className={cx(linkAcao, css({ fontSize: "inherit", ml: "auto" }))}>
                Recomeçar
              </button>
            </p>
          )}
        </header>

        <div className={colunaEtapas}>
          <EtapaTema quartinho={quartinho} erro={erros.paleta} aoMudar={mudar} />
          <hr className={divisoria} />
          <EtapaPecas quartinho={quartinho} cores={cores} erros={erros} aoMudar={mudar} />
          <hr className={divisoria} />
          <EtapaBordado
            quartinho={quartinho}
            comBordado={comBordado}
            erro={erros.bordado}
            aoLigar={(ligado) => {
              setComBordado(ligado);
              setAnuncio(ligado ? `Bordado do nome incluído: mais ${formatarPreco(PRECO_BORDADO)}.` : "Sem bordado.");
            }}
            aoMudar={mudar}
          />
        </div>

        <ResumoQuartinho
          quartinho={comBordado ? quartinho : { ...quartinho, bordado: undefined }}
          total={total}
          erros={erros}
          edicao={Boolean(edicao)}
          aoAdicionar={() => adicionar("confirmar")}
          aoPedir={() => adicionar("pedido")}
          aoRecomecar={recomecar}
        />
      </div>

      <BarraMontador total={total} escolhidos={escolhidos} edicao={Boolean(edicao)} aoAdicionar={() => adicionar("confirmar")} />

      <ConfirmacaoCarrinho
        aberta={confirmado !== null}
        aoFechar={() => {
          setConfirmado(null);
          recomecar();
        }}
        item={{
          nome: confirmado?.nome ?? "",
          detalhe: confirmado?.detalhe,
          quantidade: 1,
          preco: decimal((confirmado?.preco ?? 0) * 100),
          pix: decimal(Math.round((confirmado?.preco ?? 0) * (100 - DESCONTO_PIX_PERCENTUAL))),
          paleta: confirmado?.paleta ?? [],
        }}
        sugestoes={sugestoes}
      />

      <p role="status" aria-live="polite" className={css({ srOnly: true })}>
        {anuncio}
      </p>
    </div>
  );
}

// Cabeçalho de cada etapa: número, título de 28 e o apoio; o erro aparece logo abaixo, ao vivo.
function Etapa({ id, numero, titulo, apoio, erro, children }: { id: string; numero: number; titulo: string; apoio: string; erro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={etapa}>
      <p aria-hidden className={css({ fontSize: "sm", color: "textoSuave", fontVariantNumeric: "tabular-nums" })}>
        0{numero}
      </p>
      <h2 id={`${id}-titulo`} className={tituloEtapa}>
        {titulo}
      </h2>
      <p className={css({ mt: "2", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>{apoio}</p>
      <div aria-live="polite">
        {erro && (
          <p id={`${id}-erro`} className={cx(mensagemErro, css({ mt: "3" }))}>
            {erro}
          </p>
        )}
      </div>
      <div className={css({ display: "grid", gap: { base: "6", desktop: "8" }, mt: "6" })}>{children}</div>
    </section>
  );
}

// 1. Tema e paleta: o tema filtra as paletas (as do tema e as neutras); a paleta em bolinhas de 44/36
// com as 3 cores; e, opcional, começar de um projeto do ateliê.
function EtapaTema({ quartinho, erro, aoMudar }: { quartinho: Quartinho; erro?: string; aoMudar: (novo: Quartinho, mensagem?: string) => void }) {
  const [paletaEmFoco, setPaletaEmFoco] = useState<Paleta | null>(null);
  const paletas = paletasDoTema(quartinho.tema);
  const atual = buscarPaleta(quartinho.paleta);
  const mostrada = paletaEmFoco ?? atual;
  const projetos = listarProjetos().filter((projeto) => !quartinho.tema || projeto.tema === quartinho.tema || projeto.tema === "neutro");

  return (
    <Etapa id="etapa-tema" numero={1} titulo="Tema e paleta" apoio="As cores que vão do berço à porta. Dá para ajustar os tons com a vendedora." erro={erro}>
      <fieldset className={css({ minW: "0" })} data-erro={(erro && !quartinho.tema) || undefined}>
        <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
          <span className={rotulo}>Tema</span>
          {quartinho.tema && <span className={valor}>{TEMAS.find((tema) => tema.id === quartinho.tema)?.rotulo}</span>}
        </legend>
        <div data-erro={(erro && !quartinho.tema) || undefined} className={tresColunas}>
          {TEMAS.map((tema) => (
            <button
              key={tema.id}
              type="button"
              aria-pressed={quartinho.tema === tema.id}
              onClick={() => {
                // Trocar o tema mantém a paleta se ela continua valendo para o novo tema.
                const continua = paletasDoTema(tema.id).some((paleta) => paleta.id === quartinho.paleta);
                aoMudar({ ...quartinho, tema: tema.id, paleta: continua ? quartinho.paleta : undefined }, `Tema: ${tema.rotulo}.`);
              }}
              className={botaoOpcaoLargo}
            >
              {tema.rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={css({ minW: "0" })}>
        <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
          <span data-erro={(erro && !atual) || undefined} className={rotulo}>
            Paleta
          </span>
          {mostrada && <span className={valor}>{mostrada.nome}</span>}
        </legend>
        <ul className={cx(amostras, css({ clear: "both" }))}>
          {paletas.map((paleta) => (
            <li key={paleta.id}>
              <button
                type="button"
                aria-pressed={quartinho.paleta === paleta.id}
                aria-label={`${paleta.nome}: ${paleta.cores.map((cor) => cor.nome).join(", ")}`}
                onPointerEnter={() => setPaletaEmFoco(paleta)}
                onPointerLeave={() => setPaletaEmFoco(null)}
                onFocus={() => setPaletaEmFoco(paleta)}
                onBlur={() => setPaletaEmFoco(null)}
                onClick={() => aoMudar({ ...quartinho, tema: quartinho.tema ?? paleta.tema, paleta: paleta.id }, `Paleta ${paleta.nome}.`)}
                className={amostra}
              >
                <span className={circulo} style={{ backgroundImage: gradientePaleta(paleta) }} />
              </button>
            </li>
          ))}
        </ul>
        <p className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
          {mostrada ? mostrada.cores.map((cor) => cor.nome).join(" · ") : "Toque numa bolinha para ver as cores."}
        </p>
      </fieldset>

      <Selecao
        id="montador-projeto"
        rotulo="Começar de um projeto do ateliê (opcional)"
        value={quartinho.base ?? ""}
        dica="Preenche o tema, a paleta e as peças do projeto. Depois é só ajustar."
        onChange={(evento) => {
          const projeto = buscarProjeto(evento.target.value);
          if (projeto) aoMudar(quartinhoDoProjeto(projeto, quartinho), `${projeto.nome} carregado: ${quartinhoDoProjeto(projeto).modulos.length} peças.`);
          else aoMudar({ ...quartinho, base: undefined });
        }}
      >
        <option value="">Começar do zero</option>
        {projetos.map((projeto) => (
          <option key={projeto.slug} value={projeto.slug}>
            {projeto.nome}
          </option>
        ))}
      </Selecao>
    </Etapa>
  );
}

// "Americano", "Padrão", "Mini berço": cabe nos 3 botões do celular (o nome inteiro vai no aria-label).
function rotuloCurtoBerco(tamanho: string): string {
  const curto = tamanho.split(" · ")[0];
  const semBerco = curto.replace(/^Berço\s+/, "");
  return semBerco === curto ? curto : semBerco.charAt(0).toUpperCase() + semBerco.slice(1);
}

// Bolinha da paleta: as 3 cores em fatias (a cor é dado do projeto, por isso vai em style).
function gradientePaleta(paleta: Paleta): string {
  const passo = 100 / paleta.cores.length;
  return `conic-gradient(${paleta.cores.map((cor, indice) => `${cor.hex} ${indice * passo}% ${(indice + 1) * passo}%`).join(", ")})`;
}

// 2. Peças: os grupos com a contagem e, no Berço, o tamanho do colchão (obrigatório quando há peça de
// berço). Cada módulo é uma linha no padrão do item da sacola: foto 5:6 à esquerda e, à direita,
// nome, "a partir de", descrição, opções e "Incluir/Remover".
function EtapaPecas({
  quartinho,
  cores,
  erros,
  aoMudar,
}: {
  quartinho: Quartinho;
  cores?: string[];
  erros: ErrosQuartinho;
  aoMudar: (novo: Quartinho, mensagem?: string) => void;
}) {
  const comKit = incluido(quartinho, "kit-berco");
  const precisaTamanho = temPecasDeBerco(quartinho);
  return (
    <Etapa
      id="etapa-pecas"
      numero={2}
      titulo="Peças do quartinho"
      apoio="Inclua o que fizer sentido para o seu quarto. Os valores são a partir de, conforme as opções."
      erro={erros.modulos}
    >
      {GRUPOS_MODULOS.map((grupo) => {
        const { escolhidos, total } = contagemDoGrupo(quartinho, grupo.id);
        return (
          <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className={css({ minW: "0" })}>
            <div className={cabecalhoGrupo}>
              <h3 id={`grupo-${grupo.id}`} className={css({ fontSize: "xl", fontWeight: "normal", letterSpacing: "bloco", color: "escuro" })}>
                {grupo.nome}
              </h3>
              <p aria-live="polite" className={css({ fontSize: "sm", color: escolhidos > 0 ? "escuro" : "textoSuave", whiteSpace: "nowrap" })}>
                {escolhidos} de {total} {total === 1 ? "escolhido" : "escolhidos"}
              </p>
            </div>
            <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>{grupo.apoio}</p>

            {grupo.id === "berco" && (
              <fieldset id="tamanho-berco" className={css({ minW: "0", mt: "5", scrollMarginTop: "24" })} aria-describedby={erros.tamanhoBerco ? "erro-tamanho-berco" : "apoio-tamanho-berco"}>
                <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
                  <span data-erro={erros.tamanhoBerco ? "" : undefined} className={rotulo}>
                    Tamanho do berço
                  </span>
                  {quartinho.tamanhoBerco && <span className={valor}>{quartinho.tamanhoBerco.split(" · ")[0]}</span>}
                </legend>
                <div aria-live="polite" className={css({ clear: "both" })}>
                  {erros.tamanhoBerco && (
                    <p id="erro-tamanho-berco" className={mensagemErro}>
                      {erros.tamanhoBerco}
                    </p>
                  )}
                </div>
                <div data-erro={erros.tamanhoBerco ? "" : undefined} className={tresColunas}>
                  {TAMANHOS_BERCO.map((tamanho) => (
                    <button
                      key={tamanho}
                      type="button"
                      aria-pressed={quartinho.tamanhoBerco === tamanho}
                      aria-label={tamanho}
                      onClick={() => aoMudar({ ...quartinho, tamanhoBerco: tamanho }, `Tamanho do berço: ${tamanho}.`)}
                      className={botaoOpcaoLargo}
                    >
                      {rotuloCurtoBerco(tamanho)}
                    </button>
                  ))}
                </div>
                <p id="apoio-tamanho-berco" className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
                  {quartinho.tamanhoBerco
                    ? `Colchão de ${quartinho.tamanhoBerco.split(" · ")[1]}.`
                    : precisaTamanho
                      ? "Obrigatório para as peças de berço."
                      : "Para as peças de berço: americano 70 × 130, padrão 60 × 130 ou mini berço 50 × 90 cm."}{" "}
                  <Link href="/ajuda/guia-de-medidas" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                    Guia de medidas
                  </Link>
                </p>
              </fieldset>
            )}

            <ul className={css({ mt: "5" })}>
              {modulosDoGrupo(grupo.id).map((modulo, indice) => (
                <CartaoModulo
                  key={modulo.id}
                  modulo={modulo}
                  quartinho={quartinho}
                  cores={cores}
                  tom={indice}
                  noKit={comKit && Boolean(modulo.noKitBerco)}
                  aoMudar={aoMudar}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </Etapa>
  );
}

function CartaoModulo({
  modulo,
  quartinho,
  cores,
  tom,
  noKit,
  aoMudar,
}: {
  modulo: Modulo;
  quartinho: Quartinho;
  cores?: string[];
  tom: number;
  noKit: boolean;
  aoMudar: (novo: Quartinho, mensagem?: string) => void;
}) {
  const escolhido = quartinho.modulos.find((item) => item.id === modulo.id);
  const opcoes = opcoesCompletas(modulo, escolhido?.opcoes);
  const preco = precoDoModulo(modulo, opcoes);
  const paleta = cores ? [cores[tom % cores.length], cores[(tom + 1) % cores.length]] : undefined;

  return (
    <li data-incluido={escolhido ? "" : undefined} className={cartaoModulo}>
      <div className={css({ position: "relative", alignSelf: "start" })}>
        <FotoProjeto paleta={paleta} icone={modulo.icone} bolinhas={false} className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
        {escolhido && (
          <span aria-hidden className={seloIncluido}>
            <Check size={14} weight="bold" />
          </span>
        )}
      </div>

      <div className={css({ display: "flex", flexDirection: "column", gap: "3", minW: "0" })}>
        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: "3", rowGap: "1" })}>
          <h4 className={css({ fontSize: "md", fontWeight: "medium", lineHeight: "texto", color: "escuro" })}>{modulo.nome}</h4>
          <p className={css({ fontSize: "sm", color: "escuro", whiteSpace: "nowrap" })}>
            <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
            {formatarPreco(preco)}
          </p>
        </div>
        <p className={css({ fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
          {modulo.descricao}
          {noKit && <span className={css({ display: "block", mt: "1", color: "alerta" })}>Já vem no kit berço: avulso, entra como reposição ou outro modelo.</span>}
        </p>

        {modulo.variacoes.map((variacao) => (
          // biome-ignore lint/a11y/useSemanticElements: grupo de botões alternáveis (aria-pressed)
          <div key={variacao.id} role="group" aria-label={`${variacao.titulo} de ${modulo.nome}`}>
            <p className={css({ mb: "2", fontSize: "xs", fontWeight: "medium", color: "escuro" })}>
              {variacao.titulo}
              <span className={css({ fontWeight: "normal", color: "textoSuave" })}> · {opcoes[variacao.id]}</span>
            </p>
            <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
              {variacao.opcoes.map((opcao) => (
                <button
                  key={opcao.rotulo}
                  type="button"
                  aria-pressed={Boolean(escolhido) && opcoes[variacao.id] === opcao.rotulo}
                  data-sugerida={(!escolhido && opcoes[variacao.id] === opcao.rotulo) || undefined}
                  onClick={() =>
                    aoMudar(
                      escolherOpcao(quartinho, modulo.id, variacao.id, opcao.rotulo),
                      `${modulo.nome}: ${opcao.rotulo}${escolhido ? "" : ", incluído no quartinho"}.`,
                    )
                  }
                  className={chip}
                >
                  {opcao.rotulo}
                  {opcao.acrescimo > 0 && <span className={css({ color: "textoSuave", "[aria-pressed=true] > &": { color: "inherit" } })}>+{formatarPreco(opcao.acrescimo)}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4", mt: "1" })}>
          <button
            type="button"
            aria-pressed={Boolean(escolhido)}
            aria-label={escolhido ? `Remover ${modulo.nome}` : `Incluir ${modulo.nome}`}
            onClick={() =>
              aoMudar(alternarModulo(quartinho, modulo.id), escolhido ? `${modulo.nome} saiu do quartinho.` : `${modulo.nome} incluído: a partir de ${formatarPreco(preco)}.`)
            }
            className={botaoIncluir}
          >
            {escolhido ? (
              <>
                <Check size={16} aria-hidden /> Incluído · Remover
              </>
            ) : (
              <>
                <Plus size={16} aria-hidden /> Incluir
              </>
            )}
          </button>
          {modulo.produto && (
            <Link href={`/produto/${modulo.produto}`} className={cx(linkAcao, css({ fontSize: "xs" }))}>
              Ver peça parecida
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

// 3. Bordado do nome (opcional): sem ou com bordado; com, o nome (até 20 letras).
function EtapaBordado({
  quartinho,
  comBordado,
  erro,
  aoLigar,
  aoMudar,
}: {
  quartinho: Quartinho;
  comBordado: boolean;
  erro?: string;
  aoLigar: (ligado: boolean) => void;
  aoMudar: (novo: Quartinho) => void;
}) {
  return (
    <Etapa
      id="etapa-bordado"
      numero={3}
      titulo="Bordado do nome"
      apoio={`Opcional, mais ${formatarPreco(PRECO_BORDADO)}: o nome do bebê no protetor, nas almofadas e no enfeite de porta. O ateliê confirma a fonte e a cor da linha pelo WhatsApp.`}
      erro={erro}
    >
      <fieldset className={css({ minW: "0" })}>
        <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
          <span className={rotulo}>Bordado</span>
          <span className={valor}>{comBordado ? `Com bordado · +${formatarPreco(PRECO_BORDADO)}` : "Sem bordado"}</span>
        </legend>
        <div className={duasColunas}>
          {[false, true].map((ligado) => (
            <button
              key={String(ligado)}
              type="button"
              aria-pressed={comBordado === ligado}
              onClick={() => aoLigar(ligado)}
              className={botaoOpcaoLargo}
            >
              {ligado ? "Com bordado" : "Sem bordado"}
            </button>
          ))}
        </div>
      </fieldset>
      {comBordado && (
        <div className={css({ display: "grid", gap: "1.5", maxW: "[420px]" })}>
          <label htmlFor="montador-bordado" className={rotulo}>
            Nome a bordar
          </label>
          <input
            id="montador-bordado"
            type="text"
            autoComplete="off"
            maxLength={LIMITE_BORDADO}
            value={quartinho.bordado ?? ""}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "etapa-bordado-erro" : "montador-bordado-dica"}
            placeholder="Ex.: Helena"
            onChange={(evento) => aoMudar({ ...quartinho, bordado: evento.target.value })}
            className={campoTexto}
          />
          <p id="montador-bordado-dica" className={css({ fontSize: "xs", color: "textoSuave" })}>
            Até {LIMITE_BORDADO} letras ({(quartinho.bordado ?? "").length}/{LIMITE_BORDADO}).
          </p>
        </div>
      )}
    </Etapa>
  );
}

// Resumo fixo (como o da sacola): prévia do conjunto, miniaturas, a lista com o preço de cada peça,
// frete e produção, o total "a partir de", o selo do Pix e os botões.
function ResumoQuartinho({
  quartinho,
  total,
  erros,
  edicao,
  aoAdicionar,
  aoPedir,
  aoRecomecar,
}: {
  quartinho: Quartinho;
  total: number;
  erros: ErrosQuartinho;
  edicao: boolean;
  aoAdicionar: () => void;
  aoPedir: () => void;
  aoRecomecar: () => void;
}) {
  const paleta = buscarPaleta(quartinho.paleta);
  const linhas = linhasDoQuartinho(quartinho);
  const pendencias = ORDEM_ERROS.flatMap((chave) => (erros[chave] ? [{ chave, texto: erros[chave] as string }] : []));
  const cores = paleta?.cores.map((cor) => cor.hex);

  return (
    <aside id="resumo-quartinho" aria-labelledby="titulo-resumo-quartinho" className={resumo}>
      <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
        <h2 id="titulo-resumo-quartinho" className={tituloResumo}>
          Seu quartinho
        </h2>
        <p className={css({ fontSize: "xs", color: "textoSuave" })}>
          {quartinho.modulos.length} {quartinho.modulos.length === 1 ? "peça" : "peças"}
        </p>
      </div>
      <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>
        {[TEMAS.find((tema) => tema.id === quartinho.tema)?.rotulo, paleta?.nome].filter(Boolean).join(" · ") || "Escolha o tema e a paleta"}
      </p>

      <PreviaQuartinho quartinho={quartinho} />

      {quartinho.modulos.length > 0 && (
        <ul aria-label="Peças escolhidas" className={miniaturas}>
          {quartinho.modulos.map((item, indice) => {
            const modulo = buscarModulo(item.id);
            if (!modulo) return null;
            return (
              <li key={item.id} title={modulo.nome}>
                <FotoProjeto
                  paleta={cores ? [cores[indice % cores.length], cores[(indice + 1) % cores.length]] : undefined}
                  icone={modulo.icone}
                  bolinhas={false}
                  className={css({ aspectRatio: "[5 / 6]", w: "full", borderRadius: "xs" })}
                />
                <span className={css({ srOnly: true })}>{modulo.nome}</span>
              </li>
            );
          })}
        </ul>
      )}

      <dl className={css({ display: "grid", gap: "3", mt: "6", fontSize: "sm", lineHeight: "texto" })}>
        {linhas.length === 0 ? (
          <div className={css({ color: "textoSuave" })}>
            <dt className={css({ srOnly: true })}>Peças</dt>
            <dd>Nenhuma peça ainda. Inclua as peças do seu quartinho na etapa 2.</dd>
          </div>
        ) : (
          linhas.map((linha) => (
            <div key={linha.nome} className={linhaResumo}>
              <dt className={css({ minW: "0", color: "texto" })}>
                {linha.nome}
                <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>{linha.detalhe}</span>
              </dt>
              <dd className={css({ color: "escuro", whiteSpace: "nowrap" })}>{formatarPreco(linha.preco)}</dd>
            </div>
          ))
        )}
        {quartinho.tamanhoBerco && (
          <div className={linhaResumo}>
            <dt className={css({ color: "texto" })}>Berço</dt>
            <dd className={css({ color: "escuro", textAlign: "right" })}>{quartinho.tamanhoBerco.split(" · ")[0]}</dd>
          </div>
        )}
        <div className={cx(linhaResumo, css({ pt: "3", borderTopWidth: "1px", borderColor: "borda" }))}>
          <dt className={css({ color: "texto" })}>Frete</dt>
          <dd className={css({ color: "escuro" })}>A combinar pelo WhatsApp</dd>
        </div>
        <div className={linhaResumo}>
          <dt className={css({ color: "texto" })}>Produção</dt>
          <dd className={css({ color: "escuro" })}>{textoPrazo(PRODUCAO_PROJETO)}</dd>
        </div>
      </dl>

      <div aria-live="polite" aria-atomic="true" className={css({ mt: "4", pt: "4", borderTopWidth: "1px", borderColor: "borda" })}>
        <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "3", color: "escuro" })}>
          <span className={css({ fontSize: "md", fontWeight: "medium" })}>Total estimado</span>
          <span className={css({ textAlign: "right" })}>
            <span className={css({ fontSize: "sm", color: "textoSuave" })}>a partir de </span>
            <span className={css({ fontSize: "md", fontWeight: "medium" })}>{formatarPreco(total)}</span>
          </span>
        </div>
        <p className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2", mt: "2", fontSize: "xs", color: "textoSuave" })}>
          <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
          Frete a combinar. A vendedora confirma os valores no WhatsApp.
        </p>
      </div>

      {pendencias.length > 0 && (
        <div role="alert" className={caixaPendencias}>
          <p className={css({ fontWeight: "medium", color: "erro" })}>Falta pouco para adicionar:</p>
          <ul className={css({ display: "grid", gap: "1", mt: "1" })}>
            {pendencias.map((pendencia) => (
              <li key={pendencia.chave}>
                <a href={`#${ETAPA_DO_ERRO[pendencia.chave]}`} className={cx(linkAcao, css({ fontSize: "inherit", color: "erro" }))}>
                  {pendencia.texto}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={css({ display: "grid", gap: "3", mt: "6" })}>
        <button id="adicionar-quartinho" type="button" onClick={aoAdicionar} className={cx(botaoCompra, largo)}>
          <span className={rotuloBotao}>{edicao ? "Salvar alterações na sacola" : "Adicionar no meu enxoval"}</span>
          <span className={precoBotao}>{formatarPreco(total)}</span>
        </button>
        <button type="button" onClick={aoPedir} className={cx(botaoContorno, largo)}>
          <WhatsappLogo size={20} aria-hidden /> Fazer pedido pelo WhatsApp
        </button>
      </div>
      <p className={parcelamento}>
        <Info size={16} aria-hidden className={css({ flexShrink: "0" })} />
        <span>O pedido vai pela sacola, junto com as outras peças. Nada é cobrado no site.</span>
      </p>

      <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "3", mt: "6" })}>
        <AvisoDemonstracao />
        {!edicao && quartinho.modulos.length + (quartinho.paleta ? 1 : 0) > 0 && (
          <button type="button" onClick={aoRecomecar} className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1", fontSize: "xs" }))}>
            <ArrowCounterClockwise size={14} aria-hidden /> Recomeçar
          </button>
        )}
      </div>
      <Link href="/projetos" className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1", mt: "4", fontSize: "xs" }))}>
        Prefere um projeto pronto? Ver os projetos
        <CaretRight size={12} aria-hidden />
      </Link>
    </aside>
  );
}

// Prévia do conjunto: um quarto estilizado nos tons da paleta (parede e chão) com as peças escolhidas
// aparecendo no lugar: janela com cortina, berço (com mosquiteiro), tapete, almofadas, enfeite de
// porta e mini cama. Ilustração (aria-hidden): a lista ao lado diz o mesmo em texto.
function PreviaQuartinho({ quartinho }: { quartinho: Quartinho }) {
  const cores = buscarPaleta(quartinho.paleta)?.cores.map((cor) => cor.hex) ?? [];
  const [c1, c2, c3] = [cores[0], cores[1] ?? cores[0], cores[2] ?? cores[1] ?? cores[0]];
  const tem = (id: string) => incluido(quartinho, id);
  const berco = ["kit-berco", "protetor", "lencois", "edredom", "saia"].some(tem);
  return (
    <div
      aria-hidden
      className={previa}
      style={{
        backgroundImage: `linear-gradient(180deg, ${tomDaPaleta(c1, 28)} 0%, ${tomDaPaleta(c1, 18)} 64%, ${tomDaPaleta(c2, 40)} 64%, ${tomDaPaleta(c2, 55)} 100%)`,
      }}
    >
      {tem("cortina") ? (
        <span className={janela}>
          <span className={cx(cortina, css({ left: "0" }))} style={{ backgroundColor: tomDaPaleta(c3, 70) }} />
          <span className={cx(cortina, css({ right: "0" }))} style={{ backgroundColor: tomDaPaleta(c3, 70) }} />
        </span>
      ) : (
        <span className={janela} />
      )}
      {tem("enfeite-porta") && <span className={enfeite} style={{ borderColor: tomDaPaleta(c3, 85) }} />}
      {tem("mosquiteiro") && <span className={mosquiteiro} style={{ borderBottomColor: tomDaPaleta(c1, 45) }} />}
      {tem("tapete") && <span className={tapete} style={{ backgroundColor: tomDaPaleta(c3, 60) }} />}
      {berco && (
        <span className={bercoEstilo}>
          <span className={grade1} />
          <span className={colchao} style={{ backgroundColor: tomDaPaleta(tem("protetor") || tem("kit-berco") ? c3 : c1, 70) }} />
          {tem("saia") || tem("kit-berco") ? <span className={saia} style={{ backgroundColor: tomDaPaleta(c2, 75) }} /> : null}
        </span>
      )}
      {tem("kit-mini-cama") && <span className={miniCama} style={{ backgroundColor: tomDaPaleta(c3, 65) }} />}
      {tem("almofadas") && (
        <span className={almofadas}>
          {[c1, c3, c2].map((cor, indice) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ilustração fixa de 3 almofadas
            <span key={indice} className={almofada} style={{ backgroundColor: tomDaPaleta(cor, 80) }} />
          ))}
        </span>
      )}
      {!cores.length && <span className={css({ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "xs", color: "textoSuave" })}>A prévia ganha as cores da paleta</span>}
    </div>
  );
}

// Celular e tablet: barra fixa com o total e o "Adicionar" enquanto o botão do resumo não está na tela.
function BarraMontador({ total, escolhidos, edicao, aoAdicionar }: { total: number; escolhidos: number; edicao: boolean; aoAdicionar: () => void }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const botao = document.getElementById("adicionar-quartinho");
    if (!botao) return;
    const observador = new IntersectionObserver(([entrada]) => setVisivel(!entrada.isIntersecting));
    observador.observe(botao);
    return () => observador.disconnect();
  }, []);
  return (
    <div data-barra-fixa data-visivel={visivel || undefined} aria-hidden={!visivel} inert={!visivel} className={barraCelular}>
      <p className={css({ minW: "0" })}>
        <span className={css({ display: "block", fontSize: "xs", color: "textoSuave" })}>
          {escolhidos} {escolhidos === 1 ? "peça" : "peças"} · a partir de
        </span>
        <span className={css({ display: "block", fontSize: "lg", fontWeight: "medium", color: "escuro" })}>{formatarPreco(total)}</span>
      </p>
      <button type="button" onClick={aoAdicionar} className={cx(botaoCompra, css({ flexShrink: "0" }))}>
        {edicao ? "Salvar na sacola" : "Adicionar no enxoval"}
      </button>
    </div>
  );
}

// Contêiner da sacola (lululemon-sacola.md §2): até 1440, margens 12/20/40; grade de 12 colunas com as
// etapas nas colunas 1–7 e o resumo fixo nas 9–12 a partir de 992.
const pagina = css({
  maxW: "sacola",
  mx: "auto",
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "6", desktop: "10" },
  pb: { base: "10", desktop: "16" },
});

const grade = css({
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: { base: "2", desktop: "5" },
  rowGap: { base: "8", desktop: "8" },
  alignItems: "start",
});

const cabecalho = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, display: "grid", gap: "4", minW: "0" });

const tituloPagina = css({
  fontSize: { base: "subtitulo", md: "4xl" },
  fontWeight: "normal",
  lineHeight: "titulo",
  letterSpacing: "titulo",
  color: "escuro",
  textWrap: "balance",
});

const indiceEtapas = css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "2" });

const chipEtapa = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "9",
  pl: "1.5",
  pr: "3",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  color: "escuro",
  transitionProperty: "border-color",
  transitionDuration: "normal",
  _hover: { borderColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const numeroEtapa = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "6",
  h: "6",
  borderRadius: "pilula",
  bg: "fundoSutil",
  fontSize: "xs",
  fontVariantNumeric: "tabular-nums",
  "[data-feito] > &": { bg: "escuro", color: "fundo" },
});

const avisoRascunho = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  px: "4",
  py: "3",
  borderRadius: "md",
  bg: "fundoSutil",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
});

const colunaEtapas = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, display: "grid", gap: { base: "8", desktop: "10" }, minW: "0" });

const etapa = css({ minW: "0", scrollMarginTop: "24" });

const tituloEtapa = css({ mt: "1", fontSize: "subtitulo", fontWeight: "normal", lineHeight: "bloco", letterSpacing: "bloco", color: "escuro" });

// Botões de 44 em 3 colunas iguais (tema, tamanho do berço).
const tresColunas = css({ clear: "both", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "3", pt: "3" });
const duasColunas = css({ clear: "both", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "3", pt: "3" });

const cabecalhoGrupo = css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3", pb: "3", borderBottomWidth: "1px", borderColor: "escuro" });

// Linha do módulo: foto 5:6 (104 no celular, 140 no desktop) e o conteúdo; incluído ganha o fundo suave.
const cartaoModulo = css({
  display: "grid",
  gridTemplateColumns: { base: "[104px minmax(0, 1fr)]", md: "[140px minmax(0, 1fr)]" },
  columnGap: { base: "3", md: "5" },
  py: "5",
  borderBottomWidth: "1px",
  borderColor: "borda",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
});

const seloIncluido = css({
  position: "absolute",
  top: "2",
  left: "2",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "6",
  h: "6",
  borderRadius: "pilula",
  bg: "escuro",
  color: "fundo",
  animation: "surgir",
});

// Opção do módulo: pílula de 36 (sugerida = a padrão de um módulo ainda fora, em contorno tracejado).
const chip = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  minH: "9",
  px: "3",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "sm",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "border-color, background-color, color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { borderColor: "escuro" },
  "&[data-sugerida]": { borderStyle: "dashed", borderColor: "contornoAmostra" },
  "&[aria-pressed=true]": { borderColor: "escuro", bg: "escuro", color: "fundo" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const botaoIncluir = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minH: "11",
  px: "5",
  borderRadius: "pilula",
  borderWidth: "1px",
  borderColor: "escuro",
  bg: "transparent",
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  cursor: "pointer",
  transitionProperty: "background-color, color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "fundoSutil" },
  "&[aria-pressed=true]": { bg: "escuro", color: "fundo", _hover: { bg: "texto" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const campoTexto = css({
  w: "full",
  h: "12",
  px: "4",
  borderRadius: "campo",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "md",
  color: "escuro",
  _hover: { borderColor: "escuro" },
  _focusVisible: { outline: "none", borderColor: "escuro", boxShadow: "anelFoco" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const resumo = css({
  gridColumn: { base: "1 / -1", desktop: "9 / span 4" },
  gridRow: { desktop: "1 / span 2" },
  position: { desktop: "sticky" },
  top: { desktop: "[calc(token(sizes.topoCabecalho) + token(spacing.6))]" },
  alignSelf: "start",
  minW: "0",
  scrollMarginTop: "24",
});

const tituloResumo = css({ fontSize: "subtitulo", fontWeight: "normal", lineHeight: "bloco", letterSpacing: "bloco", color: "escuro" });

const miniaturas = css({ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: "1.5", mt: "3" });

const linhaResumo = css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "3" });

const caixaPendencias = css({ mt: "4", px: "4", py: "3", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", lineHeight: "texto" });

// Prévia: quarto 16:10 com cantos de 12; as peças são formas simples posicionadas em %.
const previa = css({ position: "relative", mt: "4", aspectRatio: "[16 / 10]", borderRadius: "lg", overflow: "hidden", bg: "fundoProduto", containerType: "inline-size" });

const janela = css({
  position: "absolute",
  top: "[12%]",
  left: "[8%]",
  w: "[22%]",
  h: "[38%]",
  borderRadius: "[4px]",
  bg: "superficie",
  boxShadow: "[inset 0 0 0 2px token(colors.borda)]",
  overflow: "hidden",
});

const cortina = css({ position: "absolute", top: "0", bottom: "0", w: "[34%]", animation: "escurecer" });

const enfeite = css({ position: "absolute", top: "[18%]", right: "[10%]", w: "[9%]", aspectRatio: "square", borderRadius: "pilula", borderWidth: "[3px]", animation: "escurecer" });

const mosquiteiro = css({
  position: "absolute",
  top: "[6%]",
  left: "[50%]",
  translate: "[-50% 0]",
  w: "0",
  h: "0",
  borderLeft: "[18cqw solid transparent]",
  borderRight: "[18cqw solid transparent]",
  borderBottomWidth: "[16cqw]",
  borderBottomStyle: "solid",
  opacity: "[0.7]",
  animation: "escurecer",
});

const tapete = css({ position: "absolute", bottom: "[6%]", left: "[50%]", translate: "[-50% 0]", w: "[46%]", h: "[18%]", borderRadius: "[50%]", animation: "escurecer" });

const bercoEstilo = css({ position: "absolute", left: "[38%]", bottom: "[22%]", w: "[34%]", h: "[30%]", animation: "escurecer" });

const grade1 = css({
  position: "absolute",
  inset: "0",
  borderWidth: "[2px]",
  borderColor: "superficie",
  borderTopWidth: "[3px]",
  bgImage: "[repeating-linear-gradient(90deg, token(colors.superficie) 0 2px, transparent 2px 12%)]",
});

const colchao = css({ position: "absolute", left: "[4%]", right: "[4%]", bottom: "[30%]", h: "[22%]", borderRadius: "[2px]" });

const saia = css({ position: "absolute", left: "0", right: "0", bottom: "0", h: "[30%]" });

const miniCama = css({ position: "absolute", left: "[74%]", bottom: "[18%]", w: "[20%]", h: "[9%]", borderRadius: "[3px]", animation: "escurecer" });

const almofadas = css({ position: "absolute", left: "[12%]", bottom: "[20%]", display: "flex", gap: "[3%]", w: "[22%]", animation: "escurecer" });

const almofada = css({ flex: "1", aspectRatio: "square", borderRadius: "[40%]", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });

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
