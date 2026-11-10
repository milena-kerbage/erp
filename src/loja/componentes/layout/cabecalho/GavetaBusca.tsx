"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { guardarBuscaRecente, lerBuscasRecentes, limparBuscasRecentes } from "@/loja/componentes/busca/buscasRecentes";
import { botaoLimpar, campoPilula, entradaBusca, linhaTermo, tituloBloco } from "@/loja/componentes/busca/estilos";
import { useSugestoes } from "@/loja/componentes/busca/useSugestoes";
import { MagnifyingGlass, X } from "@/loja/componentes/icones";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { TomMidia } from "@/loja/componentes/inicio/Midia";
import { destacar, type EloSugerido, type ProdutoSugerido, type RespostaSugestoes } from "@/loja/lib/catalogo/sugestoes";
import { montarUrlBusca, normalizarBusca } from "@/loja/lib/seo/urls";
import { Gaveta, useGaveta } from "./Gaveta";

// Busca em gaveta lateral (lululemon-referencia.md §1.6 e §2.5; lululemon-animacoes-edicao.md §4):
// o botão "Buscar" do cabeçalho abre uma gaveta de 440 px (tela cheia no celular) com o campo em
// pílula. Vazio: buscas recentes (deste navegador) e os mais buscados. Ao digitar (2 letras, 200 ms
// de espera): até 6 termos com o trecho digitado em negrito, categorias e projetos que casam e a
// grade 2 × 2 de peças sugeridas. Sem resultado: aviso e os mais buscados.
// Teclado (combobox ARIA): ↑/↓ percorrem os termos (aria-activedescendant, o foco fica no campo),
// Enter busca o termo ativo ou o digitado (/busca?q=) e fecha a gaveta, Esc limpa o campo e, vazio,
// fecha. A contagem é anunciada numa região viva. Sem JavaScript, o botão é um link para /busca.
export function GavetaBusca({ termos, destaques = [] }: { termos: string[]; destaques?: ProdutoSugerido[] }) {
  const { aberta, abrir, fechar } = useGaveta();
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [ativo, setAtivo] = useState(-1);
  const [recentes, setRecentes] = useState<string[]>([]);
  const { resposta, atual, carregando, falhou } = useSugestoes(texto);
  const id = useId();
  const idLista = `${id}-termos`;
  const idOpcao = (indice: number) => `${id}-termo-${indice}`;

  // As buscas recentes só existem no navegador: lidas ao abrir (sem divergir da página do servidor).
  useEffect(() => {
    if (aberta) setRecentes(lerBuscasRecentes());
  }, [aberta]);

  const digitando = normalizarBusca(texto).length >= 2;
  const sugestoes = digitando ? resposta : null;
  const termosSugeridos = sugestoes?.termos ?? [];
  const semResultado = digitando && atual && sugestoes !== null && sugestoes.termos.length === 0 && sugestoes.produtos.length === 0;
  const listaAberta = digitando && termosSugeridos.length > 0;

  function irParaBusca(termo: string) {
    const limpo = normalizarBusca(termo);
    if (!limpo) {
      campo.current?.focus();
      return;
    }
    setRecentes(guardarBuscaRecente(limpo));
    fechar();
    router.push(montarUrlBusca(limpo));
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    irParaBusca(ativo >= 0 && termosSugeridos[ativo] ? termosSugeridos[ativo] : texto);
  }

  // Ao navegar por um link da gaveta (peça, categoria, termo popular): guarda a busca e fecha.
  function aoNavegar(termo?: string) {
    if (termo) setRecentes(guardarBuscaRecente(termo));
    fechar();
  }

  function mudarAtivo(proximo: number) {
    setAtivo(proximo);
    if (proximo >= 0) document.getElementById(idOpcao(proximo))?.scrollIntoView({ block: "nearest" });
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    const total = termosSugeridos.length;
    if (evento.key === "ArrowDown" && total > 0) {
      evento.preventDefault();
      mudarAtivo(ativo + 1 >= total ? 0 : ativo + 1);
    } else if (evento.key === "ArrowUp" && total > 0) {
      evento.preventDefault();
      mudarAtivo(ativo <= 0 ? total - 1 : ativo - 1);
    } else if (evento.key === "Escape" && texto) {
      // 1º Esc limpa (sem fechar o <dialog>); o próximo, com o campo vazio, fecha a gaveta.
      evento.preventDefault();
      evento.stopPropagation();
      limpar();
    }
  }

  function limpar() {
    setTexto("");
    setAtivo(-1);
    campo.current?.focus();
  }

  return (
    <>
      <a
        href="/busca"
        aria-haspopup="dialog"
        className={gatilho}
        onClick={(evento) => {
          evento.preventDefault();
          abrir();
        }}
      >
        <MagnifyingGlass aria-hidden className={css({ w: { base: "6", desktop: "4" }, h: { base: "6", desktop: "4" } })} />
        <span>Buscar</span>
      </a>

      <Gaveta aberta={aberta} aoFechar={fechar} rotulo="Buscar produtos" largura="busca" classePainel={painel}>
        <div className={topo}>
          <button type="button" data-autofoco aria-label="Fechar" onClick={fechar} className={fecharBotao}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <search>
          <form action="/busca" onSubmit={buscar} className={campoPilula}>
            <MagnifyingGlass size={16} aria-hidden className={css({ flexShrink: "0" })} />
            <input
              ref={campo}
              name="q"
              type="search"
              role="combobox"
              value={texto}
              onChange={(evento) => {
                setTexto(evento.target.value);
                setAtivo(-1);
              }}
              onKeyDown={aoTeclar}
              placeholder="Buscar"
              aria-label="Buscar produtos"
              aria-autocomplete="list"
              aria-expanded={listaAberta}
              aria-controls={idLista}
              aria-activedescendant={listaAberta && ativo >= 0 ? idOpcao(ativo) : undefined}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={100}
              className={entradaBusca}
            />
            {texto && (
              <button type="button" aria-label="Limpar busca" onClick={limpar} className={botaoLimpar}>
                <X size={16} aria-hidden />
              </button>
            )}
          </form>
        </search>

        <p role="status" className={css({ srOnly: true })}>
          {anuncio({ digitando, atual, carregando, falhou, sugestoes, texto })}
        </p>

        {/* A lista existe sempre (aria-controls aponta para ela); vazia, fica fora da tela e da árvore. */}
        <div className={css({ py: "8" })} aria-busy={digitando && carregando ? true : undefined}>
          <ul
            id={idLista}
            role="listbox"
            aria-label="Sugestões de busca"
            hidden={!listaAberta}
            className={cx(css({ pb: "6" }), digitando && !atual && esmaecido)}
          >
            {termosSugeridos.map((termo, indice) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: o teclado usa o campo (setas e Enter), padrão combobox
              <li
                key={termo}
                id={idOpcao(indice)}
                role="option"
                aria-selected={indice === ativo}
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => irParaBusca(termo)}
                className={linhaTermo}
              >
                <span>
                  {destacar(termo, texto).map((trecho, posicao) =>
                    // biome-ignore lint/suspicious/noArrayIndexKey: trechos fixos de um texto
                    trecho.destaque ? <b key={posicao}>{trecho.texto}</b> : <span key={posicao}>{trecho.texto}</span>,
                  )}
                </span>
              </li>
            ))}
          </ul>

          {digitando && sugestoes && !semResultado && (
            <div className={cx(css({ display: "flex", flexDirection: "column", gap: "6" }), !atual && esmaecido)}>
              <Atalhos titulo="Categorias" itens={sugestoes.categorias} aoNavegar={() => aoNavegar(texto)} />
              <Atalhos titulo="Quartinhos" itens={sugestoes.projetos} aoNavegar={() => aoNavegar(texto)} />

              {sugestoes.produtos.length > 0 && (
                <section aria-labelledby={`${id}-pecas`} className={css({ pt: "6" })}>
                  <h2 id={`${id}-pecas`} className={tituloBloco}>
                    Peças sugeridas
                  </h2>
                  <ul className={gradePecas}>
                    {sugestoes.produtos.map((produto) => (
                      <li key={produto.slug}>
                        <Link href={produto.href} onClick={() => aoNavegar(texto)} className={cx("group", cardPeca)}>
                          <FotoProduto foto={produto.foto} cor={produto.tom as TomMidia} sizes="(min-width: 768px) 196px, 50vw" className={fotoPeca} />
                          <span className={nomePeca}>
                            {produto.base}
                            {produto.variacao && <span className={css({ color: "textoSuave" })}> {produto.variacao}</span>}
                          </span>
                          <span className={precoPeca}>{produto.preco}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Link href={montarUrlBusca(sugestoes.q)} onClick={() => aoNavegar(sugestoes.q)} className={verTodos}>
                Ver {sugestoes.total === 1 ? "o resultado" : `os ${sugestoes.total} resultados`} para “{sugestoes.q}”
              </Link>
            </div>
          )}

          {semResultado && (
            <p className={css({ pb: "8", fontSize: "md", lineHeight: "texto", color: "escuro" })}>
              Nenhum resultado para “{normalizarBusca(texto)}”. Confira a grafia ou experimente um dos termos abaixo.
            </p>
          )}

          {digitando && falhou && !sugestoes && (
            <p className={css({ pb: "8", fontSize: "md", lineHeight: "texto", color: "escuro" })}>Pressione Enter para buscar “{normalizarBusca(texto)}”.</p>
          )}

          {(!digitando || semResultado) && (
            <>
              {!digitando && recentes.length > 0 && (
                <div className={css({ pb: "8" })}>
                  <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "4" })}>
                    <h2 className={tituloBloco}>Buscas recentes</h2>
                    <button
                      type="button"
                      onClick={() => {
                        limparBuscasRecentes();
                        setRecentes([]);
                        campo.current?.focus();
                      }}
                      className={botaoTexto}
                    >
                      Limpar
                    </button>
                  </div>
                  <ListaTermos termos={recentes} aoNavegar={aoNavegar} />
                </div>
              )}
              {!digitando && destaques.length > 0 && <section aria-labelledby={`${id}-destaques`} className={css({ pt: "8" })}>
                <h2 id={`${id}-destaques`} className={tituloBloco}>Peças do ateliê</h2>
                <ul className={gradePecas}>
                  {destaques.map(produto => <li key={produto.slug}>
                    <Link href={produto.href} onClick={() => aoNavegar()} className={cx("group", cardPeca)}>
                      <FotoProduto foto={produto.foto} sizes="(min-width: 768px) 196px, 50vw" className={fotoPeca} />
                      <span className={nomePeca}>{produto.base}{produto.variacao && <span className={css({ color: "textoSuave" })}> {produto.variacao}</span>}</span>
                      <span className={precoPeca}>{produto.preco}</span>
                    </Link>
                  </li>)}
                </ul>
              </section>}
              <h2 className={cx(tituloBloco, !digitando && destaques.length > 0 && css({ pt: "8" }))}>Explore o ateliê</h2>
              <ListaTermos termos={termos} aoNavegar={aoNavegar} />
            </>
          )}
        </div>
      </Gaveta>
    </>
  );
}

function ListaTermos({ termos, aoNavegar }: { termos: string[]; aoNavegar: (termo: string) => void }) {
  return (
    <ul>
      {termos.map((termo) => (
        <li key={termo}>
          <Link href={montarUrlBusca(termo)} onClick={() => aoNavegar(termo)} className={linhaTermo}>
            <span>{termo}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// "Categorias: Kit berço · Saias de berço" — uma linha de atalhos para as listagens que casam.
function Atalhos({ titulo, itens, aoNavegar }: { titulo: string; itens: EloSugerido[]; aoNavegar: () => void }) {
  if (itens.length === 0) return null;
  return (
    <nav aria-label={titulo} className={css({ fontSize: "md", lineHeight: "texto", color: "textoSuave" })}>
      <span>{titulo}: </span>
      {itens.map((item, indice) => (
        <span key={item.href}>
          {indice > 0 && <span aria-hidden> · </span>}
          <Link href={item.href} onClick={aoNavegar} className={linkAtalho}>
            {item.rotulo}
          </Link>
        </span>
      ))}
    </nav>
  );
}

function anuncio({
  digitando,
  atual,
  carregando,
  falhou,
  sugestoes,
  texto,
}: {
  digitando: boolean;
  atual: boolean;
  carregando: boolean;
  falhou: boolean;
  sugestoes: RespostaSugestoes | null;
  texto: string;
}): string {
  if (!digitando) return "";
  if (falhou) return "Sugestões indisponíveis. Pressione Enter para buscar.";
  if (carregando || !atual || !sugestoes) return "";
  const { termos, produtos } = sugestoes;
  if (termos.length === 0 && produtos.length === 0) return `Nenhum resultado para ${normalizarBusca(texto)}.`;
  const partes = [];
  if (termos.length > 0) partes.push(`${termos.length} ${termos.length === 1 ? "sugestão" : "sugestões"} de busca`);
  if (produtos.length > 0) partes.push(`${produtos.length} ${produtos.length === 1 ? "peça sugerida" : "peças sugeridas"}`);
  return `${partes.join(" e ")}.${termos.length > 0 ? " Use as setas para percorrer as sugestões." : ""}`;
}

// "Buscar" do cabeçalho: ícone 16 + rótulo 14/500 no desktop (32 de altura, gap 6, padding 8);
// ícone 24 no celular (44 de altura, padding 10×12).
const gatilho = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  h: { base: "11", desktop: "8" },
  px: { base: "3", desktop: "2" },
  py: { base: "2.5", desktop: "2" },
  borderRadius: "pilula",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  cursor: "pointer",
  whiteSpace: "nowrap",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const painel = css({ gap: "6", px: { base: "3", md: "6" }, pb: { base: "5", md: "6" } });

// Cabeçalho de 72 px (32 em cima) com o fechar redondo de 40 à direita.
const topo = css({ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", h: "[72px]", pt: "8", flexShrink: "0" });

const fecharBotao = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  transition: "colors",
  transitionDuration: "normal",
  _hover: { bg: "superficieSuave" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

// Resposta anterior enquanto a nova não chega: um pouco apagada, sem sumir.
const esmaecido = css({ opacity: "0.6", transition: "opacity", transitionDuration: "normal" });

// Grade 2 × 2 com 8 de vão; foto 5:6 no fundo de estúdio; nome 16/400 com a variação em cinza.
const gradePecas = css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "2", rowGap: "6" });

const cardPeca = css({
  display: "flex",
  flexDirection: "column",
  borderRadius: "xs",
  color: "escuro",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const fotoPeca = css({ w: "full", aspectRatio: "[5 / 6]" });

const nomePeca = css({
  pt: "3",
  pr: "2",
  fontSize: "md",
  lineHeight: "texto",
  textWrap: "pretty",
  lineClamp: "2",
  _groupHover: { textDecoration: "underline", textUnderlineOffset: "[4px]", textDecorationThickness: "1px" },
});

const precoPeca = css({ pt: "1", fontSize: "sm", lineHeight: "texto", color: "textoSuave" });

const linkAtalho = css({
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  textDecorationThickness: "1px",
  borderRadius: "xs",
  _hover: { color: "marca" },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const verTodos = css({
  alignSelf: "flex-start",
  fontSize: "sm",
  fontWeight: "medium",
  lineHeight: "texto",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  textDecorationThickness: "1px",
  borderRadius: "xs",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});

const botaoTexto = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "[4px]",
  cursor: "pointer",
  borderRadius: "xs",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
