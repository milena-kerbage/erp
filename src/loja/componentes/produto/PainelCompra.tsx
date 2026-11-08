"use client";

import Link from "next/link";
import { createContext, type ReactNode, type RefObject, useContext, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ConfirmacaoCarrinho, type Sugestao } from "@/loja/componentes/carrinho/ConfirmacaoCarrinho";
import { adicionarAoCarrinho } from "@/loja/componentes/carrinho/estado";
import { CaretDown, CaretRight, Info } from "@/loja/componentes/icones";
import type { Opcao } from "@/loja/lib/catalogo/exemplos";
import type { Foto } from "@/loja/lib/catalogo/fotos";
import { slugificar } from "@/loja/lib/catalogo/listagem";
import { EMPRESA } from "@/loja/lib/empresa";
import { DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import { formatarPreco } from "@/loja/lib/formatacao/moeda";
import { BotaoFavoritar } from "./BotaoFavoritar";
import { classeDaCor } from "./cores";
import type { CorProduto } from "./dados";
import { partesDaOpcao } from "./dados";
import { Estrelas } from "./Estrelas";

// Só o que o painel precisa (o produto inteiro não vai para o navegador).
export type DadosCompra = {
  slug: string;
  nome: string;
  nomeBase: string;
  nomeVariacao?: string;
  preco: string;
  pix: string;
  parcelas: number;
  valorParcela: string;
  trilha: Array<{ rotulo: string; href: string }>;
  cores: CorProduto[];
  variacao?: { titulo: string; guia?: { rotulo: string; href: string }; opcoes: Opcao[] };
  personalizacao?: string;
  prontaEntrega: boolean;
  avaliacoes: { nota: number; total: number } | null;
  foto?: Foto;
};

type Compra = {
  dados: DadosCompra;
  escolha?: string;
  escolher: (rotulo: string) => void;
  bordado: string;
  setBordado: (valor: string) => void;
  erro: boolean;
  seletor: RefObject<HTMLFieldSetElement | null>;
  botaoPrincipal: RefObject<HTMLButtonElement | null>;
  comprar: () => void;
};

const ContextoCompra = createContext<Compra | null>(null);

function useCompra(): Compra {
  const valor = useContext(ContextoCompra);
  if (!valor) throw new Error("useCompra fora do CompraProvider");
  return valor;
}

// "o tamanho do berço", "a largura": artigo certo no erro e no status da entrega.
const FEMININOS = new Set(["largura", "cor", "estampa", "medida"]);
function comArtigo(titulo: string): string {
  const texto = titulo.toLowerCase();
  return `${FEMININOS.has(texto.split(" ")[0]) ? "a" : "o"} ${texto}`;
}

export const BORDADO = { com: "Com bordado", sem: "Sem bordado" } as const;

// Estado da compra compartilhado pelo painel e pela pílula fixa (que fica no fim da página): tamanho
// escolhido (também na URL, ?tamanho=), bordado, erro de "falta escolher" e a confirmação do carrinho.
export function CompraProvider({ dados, sugestoes, children }: { dados: DadosCompra; sugestoes: Sugestao[]; children: ReactNode }) {
  const opcoes = dados.variacao?.opcoes ?? [];
  const disponiveis = opcoes.filter((opcao) => opcao.disponivel);
  const [escolha, setEscolha] = useState<string | undefined>(disponiveis.length === 1 && opcoes.length === 1 ? disponiveis[0].rotulo : undefined);
  const [bordado, setBordado] = useState<string>(dados.personalizacao?.includes("incluso") ? BORDADO.com : BORDADO.sem);
  const [erro, setErro] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const seletor = useRef<HTMLFieldSetElement>(null);
  const botaoPrincipal = useRef<HTMLButtonElement>(null);

  // Tamanho vindo da URL (troca de cor mantém a escolha).
  const variacao = dados.variacao;
  useEffect(() => {
    const pedido = new URLSearchParams(window.location.search).get("tamanho");
    const achada = pedido ? variacao?.opcoes.find((opcao) => opcao.disponivel && slugificar(partesDaOpcao(opcao.rotulo).curto) === pedido) : undefined;
    if (achada) setEscolha(achada.rotulo);
  }, [variacao]);

  function escolher(rotulo: string) {
    setEscolha(rotulo);
    setErro(false);
    const url = new URL(window.location.href);
    url.searchParams.set("tamanho", slugificar(partesDaOpcao(rotulo).curto));
    window.history.replaceState(window.history.state, "", url);
  }

  function comprar() {
    if (dados.variacao && !escolha) {
      setErro(true);
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      seletor.current?.scrollIntoView({ block: "center", behavior: reduzir ? "auto" : "smooth" });
      seletor.current?.querySelector<HTMLButtonElement>("button:not([aria-disabled=true])")?.focus({ preventScroll: true });
      return;
    }
    adicionarAoCarrinho({
      slug: dados.slug,
      variacao: escolha,
      quantidade: 1,
      ...(dados.personalizacao ? { personalizacao: bordado === BORDADO.com ? "com" : "sem" } : {}),
    });
    setConfirmado(true);
  }

  const detalhe = [escolha && `${dados.variacao?.titulo}: ${escolha}`, dados.personalizacao && bordado].filter(Boolean).join(" · ");

  return (
    <ContextoCompra.Provider value={{ dados, escolha, escolher, bordado, setBordado, erro, seletor, botaoPrincipal, comprar }}>
      {children}
      <ConfirmacaoCarrinho
        aberta={confirmado}
        aoFechar={() => setConfirmado(false)}
        item={{
          nome: dados.nome,
          foto: dados.foto,
          detalhe: detalhe || undefined,
          quantidade: 1,
          pix: dados.pix,
          preco: dados.preco,
        }}
        sugestoes={sugestoes}
      />
    </ContextoCompra.Provider>
  );
}

// Rótulo do desconto no Pix: a loja é um catálogo com preço (o pedido é fechado pelo WhatsApp), então
// o valor do Pix nunca é calculado na tela, só o percentual.
const ROTULO_PIX = `${DESCONTO_PIX_PERCENTUAL}% OFF no Pix`;

const linkWhatsapp = (texto: string) => `https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent(texto)}`;

// Painel de compra (lululemon-pdp.md §1.3 e §6): blocos com 32 de espaço (24 no celular), na ordem
// trilha, título + favorito, preço (com o selo do Pix), cor, tamanho, divisória, bordado, divisória,
// entrega (informativa: o frete é combinado pelo WhatsApp), botão, parcelamento e a nota de que o
// pedido é finalizado pelo WhatsApp, divisória e resumo de avaliações. No celular a COR vem primeiro.
// Os blocos entram com uma subida suave e escalonada ao abrir o produto (entrarPainel).
export function PainelCompra() {
  const { dados, escolha, escolher, bordado, setBordado, erro, seletor, botaoPrincipal, comprar } = useCompra();
  const [corEmFoco, setCorEmFoco] = useState<string | null>(null);
  const corAtual = dados.cores.find((cor) => cor.atual);
  const coresComLink = dados.cores.some((cor) => cor.slug);
  const opcoes = dados.variacao?.opcoes ?? [];
  const parteEscolhida = escolha ? partesDaOpcao(escolha) : undefined;
  const sufixoTamanho = parteEscolhida ? `?tamanho=${slugificar(parteEscolhida.curto)}` : "";
  const prazo = dados.prontaEntrega ? "Pronta entrega" : "Sob encomenda: 15 a 25 dias úteis";

  return (
    <div id="painel-compra" className={secoes}>
      {dados.trilha.length > 0 && (
        <nav aria-label="Você está em" className={trilha}>
          <ol className={css({ display: "flex", flexWrap: "wrap" })}>
            {dados.trilha.map((elo, indice) => (
              <li key={elo.href}>
                {indice > 0 && (
                  <span aria-hidden className={css({ mx: "1" })}>
                    /
                  </span>
                )}
                <Link href={elo.href} className={linkTrilha}>
                  {elo.rotulo}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div>
        <div className={linhaTitulo}>
          <h1 className={titulo}>
            {dados.nomeBase}
            {dados.nomeVariacao && <span className={css({ color: "textoSuave" })}> {dados.nomeVariacao}</span>}
          </h1>
          <BotaoFavoritar slug={dados.slug} nome={dados.nome} variante="linha" />
        </div>
        <p className={preco}>
          {formatarPreco(dados.preco)}
          <span className={seloPix}>{ROTULO_PIX}</span>
        </p>
      </div>

      {dados.cores.length > 0 && (
        <div className={blocoCor}>
          <p className={linhaRotulo}>
            <span className={rotulo}>{coresComLink || dados.cores.length === 1 ? "Cor" : "Cores disponíveis"}</span>
            <span className={valor}>
              {coresComLink || dados.cores.length === 1
                ? (corEmFoco ?? corAtual?.rotulo)
                : dados.cores.map((cor) => cor.rotulo).join(", ")}
            </span>
          </p>
          <ul className={amostras}>
            {dados.cores.map((cor) => (
              <li key={cor.rotulo} className={css({ position: "relative" })}>
                {cor.slug ? (
                  <Link
                    href={`/produto/${cor.slug}${sufixoTamanho}`}
                    replace
                    scroll={false}
                    aria-label={`${cor.rotulo}${cor.novo ? ", novo" : ""}`}
                    aria-current={cor.atual ? "page" : undefined}
                    onPointerEnter={() => setCorEmFoco(cor.rotulo)}
                    onPointerLeave={() => setCorEmFoco(null)}
                    onFocus={() => setCorEmFoco(cor.rotulo)}
                    onBlur={() => setCorEmFoco(null)}
                    className={amostra}
                  >
                    <span className={cx(circulo, classeDaCor(cor.rotulo))} />
                  </Link>
                ) : (
                  <span role="img" aria-label={cor.rotulo} aria-current={dados.cores.length === 1 || undefined} className={amostra}>
                    <span className={cx(circulo, classeDaCor(cor.rotulo))} />
                  </span>
                )}
                {cor.novo && (
                  <span aria-hidden className={seloNovo}>
                    Novo
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dados.variacao && (
        <fieldset ref={seletor} aria-describedby={erro ? "erro-tamanho" : "apoio-tamanho"} className={css({ minW: "0", scrollMarginTop: "24" })}>
          <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
            <span data-erro={erro || undefined} className={rotulo}>
              {dados.variacao.titulo}
            </span>
            {parteEscolhida && <span className={valor}>{parteEscolhida.curto}</span>}
          </legend>
          <div aria-live="polite" className={css({ clear: "both" })}>
            {erro && (
              <p id="erro-tamanho" className={mensagemErro}>
                Selecione {comArtigo(dados.variacao.titulo)} para adicionar ao seu enxoval.
              </p>
            )}
          </div>
          <div data-erro={erro || undefined} className={gradeOpcoes}>
            {opcoes.map((opcao) => {
              const { curto } = partesDaOpcao(opcao.rotulo);
              return (
                <button
                  key={opcao.rotulo}
                  type="button"
                  aria-pressed={escolha === opcao.rotulo}
                  aria-disabled={!opcao.disponivel || undefined}
                  aria-label={opcao.disponivel ? opcao.rotulo : `${opcao.rotulo}, esgotado`}
                  data-largo={curto.length > 7 || undefined}
                  onClick={() => opcao.disponivel && escolher(opcao.rotulo)}
                  className={botaoOpcao}
                >
                  {curto}
                </button>
              );
            })}
          </div>
          <div className={linhaApoio}>
            <p id="apoio-tamanho">
              {parteEscolhida?.detalhe
                ? `${parteEscolhida.curto}: ${parteEscolhida.detalhe}.`
                : opcoes.some((opcao) => !opcao.disponivel)
                  ? `Opções riscadas estão esgotadas no momento.`
                  : "Confira as medidas antes de escolher."}
            </p>
            {dados.variacao.guia && (
              <Link href={dados.variacao.guia.href} className={linkSeta}>
                Guia de medidas
                <CaretRight size={12} aria-hidden />
              </Link>
            )}
          </div>
        </fieldset>
      )}

      <hr className={divisoria} />

      {dados.personalizacao && (
        <>
          <fieldset className={css({ minW: "0" })}>
            <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
              <span className={rotulo}>Bordado do nome</span>
              <span className={valor}>{bordado}</span>
            </legend>
            <div className={cx(gradeOpcoes, css({ clear: "both" }))}>
              {[BORDADO.sem, BORDADO.com].map((opcao) => (
                <button key={opcao} type="button" aria-pressed={bordado === opcao} data-largo onClick={() => setBordado(opcao)} className={botaoOpcao}>
                  {opcao}
                </button>
              ))}
            </div>
            <p className={apoioBordado}>{dados.personalizacao}. O ateliê confirma o nome pelo WhatsApp antes de bordar.</p>
          </fieldset>
          <hr className={divisoria} />
        </>
      )}

      <ul aria-label="Entrega e retirada" className={entregas}>
        {[
          { titulo: "Entrega para todo o Brasil", apoio: "Frete combinado pelo WhatsApp" },
          { titulo: "Retirada no ateliê", apoio: `${EMPRESA.cidade}/${EMPRESA.uf}` },
        ].map((opcao) => (
          <li key={opcao.titulo} className={cartaoEntrega}>
            <span className={css({ fontWeight: "medium", color: "escuro" })}>{opcao.titulo}</span>
            <span className={css({ color: "textoSuave" })}>{opcao.apoio}</span>
            <span className={css({ color: "sucesso" })}>{prazo}</span>
          </li>
        ))}
      </ul>

      <div>
        <button ref={botaoPrincipal} type="button" onClick={comprar} className={cx(botaoCompra, css({ w: "full" }))}>
          <span className={rotuloBotao}>Adicionar no meu enxoval</span>
          <span className={precoBotao}>{formatarPreco(dados.preco)}</span>
        </button>
        <p className={parcelamento}>
          <Info size={16} aria-hidden className={css({ flexShrink: "0" })} />
          <span>
            {dados.parcelas > 1 && `ou em até ${dados.parcelas}x · `}
            {ROTULO_PIX}
          </span>
        </p>
        <a
          href={linkWhatsapp(`Olá! Quero fazer o pedido de ${dados.nome}${escolha ? ` (${escolha})` : ""}.`)}
          target="_blank"
          rel="noreferrer"
          className={cx(linkSeta, css({ mt: "4" }))}
        >
          Você finaliza o pedido pelo WhatsApp com o ateliê
          <CaretRight size={12} aria-hidden />
          <span className={css({ srOnly: true })}> (abre em nova aba)</span>
        </a>
      </div>

      <hr className={divisoria} />

      <a href="#avaliacoes" className={resumoAvaliacoes}>
        {dados.avaliacoes ? (
          <>
            <span className={notaGrande}>{dados.avaliacoes.nota.toFixed(1).replace(".", ",")}</span>
            <Estrelas nota={dados.avaliacoes.nota} />
            <span className={totalAvaliacoes}>
              {dados.avaliacoes.total} {dados.avaliacoes.total === 1 ? "avaliação" : "avaliações"}
              <CaretDown size={14} aria-hidden />
            </span>
          </>
        ) : (
          <>
            <Estrelas nota={0} />
            <span className={totalAvaliacoes}>
              Seja a primeira a avaliar
              <CaretDown size={14} aria-hidden />
            </span>
          </>
        )}
      </a>
    </div>
  );
}

// Pílula fixa (lululemon-pdp.md §1.4): sticky na base, centralizada, mín. 280 × 44, aparece quando o
// botão principal sai da tela por cima e some perto do rodapé (opacidade e visibilidade, 250 ms).
// Enquanto aparece, a barra flutuante do site sai de cena (data-compra-fixa).
export function PilulaCompra() {
  const { botaoPrincipal, comprar, dados } = useCompra();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const botao = botaoPrincipal.current;
    if (!botao) return;
    let passou = false;
    let noRodape = false;
    const atualizar = () => setVisivel(passou && !noRodape);
    const observaBotao = new IntersectionObserver(([entrada]) => {
      passou = !entrada.isIntersecting && entrada.boundingClientRect.top < 0;
      atualizar();
    });
    observaBotao.observe(botao);
    const rodape = document.querySelector("footer");
    const observaRodape = new IntersectionObserver(
      ([entrada]) => {
        noRodape = entrada.isIntersecting;
        atualizar();
      },
      { rootMargin: "0px 0px 160px 0px" },
    );
    if (rodape) observaRodape.observe(rodape);
    return () => {
      observaBotao.disconnect();
      observaRodape.disconnect();
    };
  }, [botaoPrincipal]);

  return (
    <div data-visivel={visivel || undefined} data-compra-fixa={visivel || undefined} className={trilhoPilula}>
      <button type="button" onClick={comprar} className={cx(botaoCompra, pilulaBotao)}>
        <span className={rotuloBotao}>Adicionar no meu enxoval</span>
        <span className={precoBotao}>{formatarPreco(dados.preco)}</span>
      </button>
    </div>
  );
}

const secoes = css({
  display: "flex",
  flexDirection: "column",
  gap: { base: "6", desktop: "8" },
  pt: { base: "4", desktop: "0" },
  // Entrada ao abrir o produto: cada bloco sobe 8 px e aparece (500 ms), escalonado a cada 50 ms.
  "& > *": { animation: "entrarPainel" },
  "& > :nth-child(2)": { animationDelay: "[50ms]" },
  "& > :nth-child(3)": { animationDelay: "[100ms]" },
  "& > :nth-child(4)": { animationDelay: "[150ms]" },
  "& > :nth-child(5)": { animationDelay: "[200ms]" },
  "& > :nth-child(n + 6)": { animationDelay: "[250ms]" },
});

const trilha = css({ display: { base: "none", desktop: "block" }, fontSize: "sm", lineHeight: "texto", color: "escuro" });

const linkTrilha = css({
  textDecoration: "none",
  _hover: { textDecoration: "underline", textUnderlineOffset: "[4px]" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const linhaTitulo = css({ display: "grid", gridTemplateColumns: "[1fr 24px]", alignItems: "start", gap: "4" });

const titulo = css({
  fontFamily: "corpo",
  fontSize: "subtitulo",
  fontWeight: "normal",
  lineHeight: { base: "bloco", desktop: "subtitulo" },
  letterSpacing: "bloco",
  color: "escuro",
  textWrap: "pretty",
});

const preco = css({ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2", mt: "2.5", fontSize: "sm", lineHeight: "texto", color: "escuro" });

// "5% OFF no Pix": selo discreto ao lado do preço.
const seloPix = css({
  px: "2",
  borderRadius: "pilula",
  bg: "sucessoSuave",
  fontSize: "xs",
  fontWeight: "medium",
  lineHeight: "[20px]",
  color: "sucesso",
});

// No celular a cor vem antes do título (§6).
const blocoCor = css({ order: { base: "-1", desktop: "0" } });

const linhaRotulo = css({ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2", lineHeight: "texto" });
const rotulo = css({ fontSize: "sm", fontWeight: "medium", color: "escuro", "&[data-erro]": { color: "erro" } });
const valor = css({ fontSize: "md", color: "escuro" });

// Bolinhas: alvo de 44 com 4 de respiro e círculo de 36; a cor atual ganha o anel escuro encostado.
const amostras = css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "3" });

const amostra = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: "11",
  h: "11",
  p: "1",
  borderRadius: "pilula",
  cursor: "pointer",
  outline: "[1px solid transparent]",
  outlineOffset: "[-1px]",
  transitionProperty: "outline-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  "&[aria-current]": { outlineColor: "escuro" },
  "&:is(a):hover": { outlineColor: "contornoAmostra" },
  "&:is(a)[aria-current]:hover": { outlineColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const circulo = css({ display: "block", w: "9", h: "9", borderRadius: "pilula", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });

const seloNovo = css({
  position: "absolute",
  top: "[-6px]",
  right: "[-8px]",
  px: "1.5",
  borderRadius: "pilula",
  bg: "superficie",
  borderWidth: "1px",
  borderColor: "borda",
  fontSize: "[10px]",
  fontWeight: "medium",
  lineHeight: "[16px]",
  color: "escuro",
  pointerEvents: "none",
});

const mensagemErro = css({ mt: "2", fontSize: "sm", lineHeight: "texto", color: "erro" });

// Desktop: grade de 4 colunas (89 × 44 em 1200), 12 de espaço. Celular e tablet: botões de 86 × 44
// em fluxo. Rótulos longos ocupam 2 colunas.
const gradeOpcoes = css({
  display: { base: "flex", desktop: "grid" },
  flexWrap: "wrap",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "3",
  mt: "3",
});

const botaoOpcao = css({
  w: { base: "opcaoTamanho", desktop: "auto" },
  h: "11",
  px: "1",
  borderRadius: "[4.8px]",
  borderWidth: "1px",
  borderColor: "borda",
  bg: "superficie",
  fontSize: "md",
  color: "escuro",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transitionProperty: "border-color",
  transitionDuration: "normal",
  _hover: { borderColor: "escuro" },
  "&[data-largo]": { w: { base: "auto", desktop: "auto" }, minW: "opcaoTamanho", px: "4", gridColumn: "span 2" },
  "&[aria-pressed=true]": { borderColor: "escuro", fontWeight: "semibold" },
  "&[aria-disabled=true]": {
    color: "desabilitado",
    textDecoration: "line-through",
    bg: "fundoSutil",
    cursor: "not-allowed",
    _hover: { borderColor: "borda" },
  },
  "[data-erro] > &": { "&:not([aria-disabled=true])": { borderColor: "erro" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const linhaApoio = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "4",
  mt: "3",
  fontSize: "sm",
  lineHeight: "texto",
  color: "textoSuave",
});

const apoioBordado = css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" });

const linkSeta = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  flexShrink: "0",
  fontSize: "sm",
  lineHeight: "texto",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  textDecorationColor: "transparent",
  transitionProperty: "text-decoration-color",
  transitionDuration: "normal",
  _hover: { textDecorationColor: "escuro" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const divisoria = css({ borderTopWidth: "1px", borderColor: "borda", m: "0" });

const entregas = css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { base: "3", desktop: "4" }, minW: "0" });

// Cartões informativos (sem escolha): título, apoio e o status de produção em verde.
const cartaoEntrega = css({
  display: "flex",
  flexDirection: "column",
  gap: "1",
  minH: "[112px]",
  p: "3",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "[4.8px]",
  fontSize: "sm",
  lineHeight: "texto",
});

// Botão principal: pílula de 44, escuro, texto à esquerda e preço à direita (392 × 44 em 1200 cabe
// "Adicionar no meu enxoval" + preço com folga). Em tela muito estreita o texto quebra em 2 linhas
// equilibradas e o preço nunca é cortado.
const botaoCompra = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  minH: "11",
  px: "5",
  py: "3",
  borderRadius: "pilula",
  bg: "escuro",
  color: "fundo",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "[1.2]",
  textAlign: "left",
  cursor: "pointer",
  transitionProperty: "background-color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { bg: "marcaContraste" },
  _active: { transform: "scale(0.99)" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const rotuloBotao = css({ minW: "0", textWrap: "balance" });
const precoBotao = css({ flexShrink: "0", whiteSpace: "nowrap" });

// Pílula fixa: mín. 280, 24 entre o texto e o preço e nunca mais larga que a tela (12 de cada lado).
const pilulaBotao = css({ minW: "pilulaCompra", maxW: "[calc(100vw - 24px)]", gap: "6" });

const parcelamento = css({ display: "flex", alignItems: "center", gap: "2", mt: "3", fontSize: "xs", lineHeight: "texto", color: "textoSuave" });

const resumoAvaliacoes = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  color: "escuro",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  _hover: { "& > span:last-child": { textDecoration: "underline", textUnderlineOffset: "[4px]" } },
});

const notaGrande = css({ fontSize: "subtitulo", lineHeight: "none", color: "escuro" });

const totalAvaliacoes = css({ display: "inline-flex", alignItems: "center", gap: "1", ml: "auto", fontSize: "sm" });

const trilhoPilula = css({
  position: "sticky",
  bottom: "0",
  zIndex: "pilulaCompra",
  display: "flex",
  justifyContent: "center",
  w: "fit-content",
  minW: "pilulaCompra",
  mx: "auto",
  pb: "[calc(24px + env(safe-area-inset-bottom))]",
  opacity: "0",
  visibility: "hidden",
  transform: "translateY(8px)",
  transitionProperty: "opacity, visibility, transform",
  transitionDuration: "aparecer",
  transitionTimingFunction: "assinatura",
  "&[data-visivel]": { opacity: "1", visibility: "visible", transform: "none" },
});
