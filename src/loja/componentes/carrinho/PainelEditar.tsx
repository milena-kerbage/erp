"use client";

import { type ReactNode, useState } from "react";
import { css, cx } from "styled-system/css";
import { FotoProduto } from "@/loja/componentes/produto/FotoProduto";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { produtoDoProjeto } from "@/loja/lib/carrinho/linhas";
import { centavos } from "@/loja/lib/carrinho/totais";
import { buscarProjeto, OPCIONAIS, PACOTES, pacoteValido } from "@/loja/lib/casas/catalogo";
import { Dialogo } from "./Dialogo";
import { type ItemCarrinho, type Personalizacao, ROTULO_PERSONALIZACAO } from "./estado";
import { botaoEscuro, largo, opcaoPilula } from "./estilos";
import { FotoItem } from "./FotoItem";
import { Quantidade, situacaoDe } from "./ItemSacola";
import { reais } from "./Resumo";

export type AlvoEdicao = { modo: "editar" | "mover"; item: ItemCarrinho };

// Bordado padrão de quem ainda não escolheu: o da página de produto (incluso → com bordado).
export function personalizacaoPadrao(produto: ProdutoCarrinho): Personalizacao | undefined {
  if (!produto.personalizacao) return undefined;
  return produto.personalizacao.includes("incluso") ? "com" : "sem";
}

// "Editar" da sacola (lululemon-sacola.md §4, "Edit"): os mesmos controles da página de produto em
// gaveta: cor (a peça-irmã de outra cor), tamanho, bordado e quantidade, e "Salvar". Também serve
// para "Mover para a sacola" um favorito que exige escolher o tamanho.
// Montado só enquanto há um alvo (a página usa `key` para recomeçar a cada abertura). Fechar (Esc,
// véu, X ou depois de salvar) passa pelo close() do <dialog>, que devolve o foco a quem abriu.
export function PainelEditar({
  alvo,
  porSlug,
  aoFechar,
  aoSalvar,
}: {
  alvo: AlvoEdicao;
  porSlug: Map<string, ProdutoCarrinho>;
  aoFechar: () => void;
  aoSalvar: (alvo: AlvoEdicao, novo: ItemCarrinho) => void;
}) {
  if (alvo.item.tipo === "projeto") return <EditarProjeto alvo={alvo} aoFechar={aoFechar} aoSalvar={aoSalvar} />;
  return <EditarProduto alvo={alvo} porSlug={porSlug} aoFechar={aoFechar} aoSalvar={aoSalvar} />;
}

function EditarProduto({
  alvo,
  porSlug,
  aoFechar,
  aoSalvar,
}: {
  alvo: AlvoEdicao;
  porSlug: Map<string, ProdutoCarrinho>;
  aoFechar: () => void;
  aoSalvar: (alvo: AlvoEdicao, novo: ItemCarrinho) => void;
}) {
  const [aberto, setAberto] = useState(true);
  const [slug, setSlug] = useState(alvo.item.slug);
  const [variacao, setVariacao] = useState(alvo.item.variacao);
  const [personalizacao, setPersonalizacao] = useState(alvo.item.personalizacao);
  const [quantidade, setQuantidade] = useState(alvo.item.quantidade);
  const [erro, setErro] = useState(false);
  const produto = porSlug.get(slug);
  if (!produto) return null;

  const opcoes = produto.opcoes ?? [];
  const cores = (produto.cores ?? []).filter((cor) => porSlug.has(cor.slug));
  const valida = opcoes.length === 0 || opcoes.some((opcao) => opcao.disponivel && opcao.rotulo === variacao);
  const titulo = alvo.modo === "mover" ? "Mover para a sacola" : "Editar item";

  function trocarCor(novo: string) {
    const irmao = porSlug.get(novo);
    if (!irmao) return;
    setSlug(novo);
    // O tamanho escolhido continua se existir (e estiver disponível) na outra cor.
    if (!irmao.opcoes?.some((opcao) => opcao.disponivel && opcao.rotulo === variacao)) setVariacao(undefined);
    if (!irmao.personalizacao) setPersonalizacao(undefined);
    else if (!personalizacao) setPersonalizacao(personalizacaoPadrao(irmao));
  }

  function salvar() {
    if (!valida) {
      setErro(true);
      return;
    }
    aoSalvar(alvo, {
      slug,
      ...(opcoes.length > 0 && variacao ? { variacao } : {}),
      quantidade,
      ...(produto?.personalizacao && personalizacao ? { personalizacao } : {}),
    });
    setAberto(false);
  }

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      variante="gaveta"
      rodape={
        <button type="button" onClick={salvar} className={cx(botaoEscuro, largo)}>
          {alvo.modo === "mover" ? "Mover para a sacola" : "Salvar alterações"}
        </button>
      }
    >
      <div className={css({ display: "grid", gridTemplateColumns: "[120px minmax(0, 1fr)]", gap: "4", alignItems: "start" })}>
        <FotoProduto foto={produto.foto} sizes="120px" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
        <div className={css({ display: "grid", gap: "2" })}>
          <p className={css({ fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>{situacaoDe(produto, { personalizacao })}</p>
          <p className={css({ fontSize: "md", lineHeight: "texto", color: "escuro" })}>{produto.nome}</p>
          <p className={css({ fontSize: "sm", color: "escuro" })}>
            <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
            {reais(centavos(produto.preco) * quantidade)}
          </p>
        </div>
      </div>

      <div className={css({ display: "grid", gap: "8", mt: "8" })}>
        {cores.length > 1 && (
          <Grupo titulo="Cor" valor={produto.cor}>
            {cores.map((cor) => (
              <button key={cor.slug} type="button" aria-pressed={cor.slug === slug} onClick={() => trocarCor(cor.slug)} className={opcaoPilula}>
                {cor.rotulo}
              </button>
            ))}
          </Grupo>
        )}

        {opcoes.length > 0 && (
          <Grupo titulo={produto.variacaoTitulo ?? "Opção"} valor={variacao} erro={erro && !valida ? `Escolha ${(produto.variacaoTitulo ?? "uma opção").toLowerCase()}.` : undefined}>
            {opcoes.map((opcao) => (
              <button
                key={opcao.rotulo}
                type="button"
                aria-pressed={opcao.rotulo === variacao}
                disabled={!opcao.disponivel}
                onClick={() => {
                  setVariacao(opcao.rotulo);
                  setErro(false);
                }}
                className={opcaoPilula}
              >
                {opcao.rotulo}
                {!opcao.disponivel && <span className={css({ srOnly: true })}> (esgotado)</span>}
              </button>
            ))}
          </Grupo>
        )}

        {produto.personalizacao && (
          <Grupo titulo="Bordado do nome" valor={personalizacao && ROTULO_PERSONALIZACAO[personalizacao]} apoio={`${produto.personalizacao}. O ateliê confirma o nome pelo WhatsApp antes de bordar.`}>
            {(["sem", "com"] as const).map((opcao) => (
              <button key={opcao} type="button" aria-pressed={personalizacao === opcao} onClick={() => setPersonalizacao(opcao)} className={opcaoPilula}>
                {ROTULO_PERSONALIZACAO[opcao]}
              </button>
            ))}
          </Grupo>
        )}

        <div>
          <p className={rotuloGrupo}>Quantidade</p>
          <Quantidade quantidade={quantidade} nome={produto.nome} aoMudar={setQuantidade} />
        </div>
      </div>
    </Dialogo>
  );
}

// Projeto de quarto: troca o pacote, liga e desliga os opcionais e muda a quantidade, com o "a partir
// de" atualizado na hora (mesmos controles e medidas da edição de peça).
function EditarProjeto({
  alvo,
  aoFechar,
  aoSalvar,
}: {
  alvo: AlvoEdicao;
  aoFechar: () => void;
  aoSalvar: (alvo: AlvoEdicao, novo: ItemCarrinho) => void;
}) {
  const [aberto, setAberto] = useState(true);
  const [pacote, setPacote] = useState(pacoteValido(alvo.item.pacote));
  const [opcionais, setOpcionais] = useState<string[]>(alvo.item.opcionais ?? []);
  const [quantidade, setQuantidade] = useState(alvo.item.quantidade);
  const projeto = buscarProjeto(alvo.item.slug);
  const novo: ItemCarrinho = { tipo: "projeto", slug: alvo.item.slug, pacote, opcionais, quantidade };
  const produto = produtoDoProjeto(novo);
  if (!projeto || !produto) return null;
  const disponiveis = OPCIONAIS.filter((opcional) => projeto.opcionais.includes(opcional.id));
  const itensPacote = PACOTES.find((atual) => atual.nome === pacote)?.itens ?? [];

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Editar quartinho"
      variante="gaveta"
      rodape={
        <button
          type="button"
          onClick={() => {
            aoSalvar(alvo, novo);
            setAberto(false);
          }}
          className={cx(botaoEscuro, largo)}
        >
          Salvar alterações
        </button>
      }
    >
      <div className={css({ display: "grid", gridTemplateColumns: "[120px minmax(0, 1fr)]", gap: "4", alignItems: "start" })}>
        <FotoItem produto={produto} sizes="120px" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
        <div className={css({ display: "grid", gap: "2" })}>
          <p className={css({ fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>{situacaoDe(produto)}</p>
          <p className={css({ fontSize: "md", lineHeight: "texto", color: "escuro" })}>{produto.nome}</p>
          <p aria-live="polite" className={css({ fontSize: "sm", color: "escuro" })}>
            <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
            {reais(centavos(produto.preco) * quantidade)}
          </p>
        </div>
      </div>

      <div className={css({ display: "grid", gap: "8", mt: "8" })}>
        <Grupo titulo="Pacote" valor={pacote} apoio={`Inclui: ${itensPacote.join("; ")}.`}>
          {PACOTES.map((opcao) => (
            <button key={opcao.nome} type="button" aria-pressed={pacote === opcao.nome} onClick={() => setPacote(opcao.nome)} className={opcaoPilula}>
              {opcao.nome}
            </button>
          ))}
        </Grupo>

        {disponiveis.length > 0 && (
          <Grupo titulo="Opcionais" valor={opcionais.length > 0 ? `${opcionais.length} ${opcionais.length === 1 ? "escolhido" : "escolhidos"}` : undefined}>
            {disponiveis.map((opcional) => {
              const ligado = opcionais.includes(opcional.id);
              return (
                <button
                  key={opcional.id}
                  type="button"
                  aria-pressed={ligado}
                  onClick={() => setOpcionais((atuais) => (ligado ? atuais.filter((id) => id !== opcional.id) : [...atuais, opcional.id]))}
                  className={opcaoPilula}
                >
                  {opcional.curto} · + {reais(opcional.preco * 100)}
                </button>
              );
            })}
          </Grupo>
        )}

        <div>
          <p className={rotuloGrupo}>Quantidade</p>
          <Quantidade quantidade={quantidade} nome={produto.nome} aoMudar={setQuantidade} />
        </div>
      </div>
    </Dialogo>
  );
}

function Grupo({
  titulo,
  valor,
  erro,
  apoio,
  children,
}: {
  titulo: string;
  valor?: string;
  erro?: string;
  apoio?: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de botões alternáveis (aria-pressed)
    <div role="group" aria-label={titulo}>
      <p className={rotuloGrupo}>
        {titulo}
        {valor && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> · {valor}</span>}
      </p>
      <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>{children}</div>
      {apoio && <p className={css({ mt: "2", fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>{apoio}</p>}
      {erro && (
        <p role="alert" className={css({ mt: "2", fontSize: "sm", color: "erro" })}>
          {erro}
        </p>
      )}
    </div>
  );
}

const rotuloGrupo = css({ mb: "3", fontSize: "sm", fontWeight: "medium", lineHeight: "texto", color: "escuro" });
