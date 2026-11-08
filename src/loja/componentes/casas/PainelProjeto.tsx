"use client";

import Link from "next/link";
import { createContext, type ReactNode, type RefObject, useContext, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { ConfirmacaoCarrinho, type Sugestao } from "@/loja/componentes/carrinho/ConfirmacaoCarrinho";
import { adicionarAoCarrinho, migrarSelecaoAntiga } from "@/loja/componentes/carrinho/estado";
import { CaretRight, Check, Info } from "@/loja/componentes/icones";
import { DESCONTO_PIX_PERCENTUAL, decimal } from "@/loja/lib/carrinho/totais";
import { type Cor, formatarPreco, type NomePacote, PACOTES, pacoteValido } from "@/loja/lib/casas/catalogo";
import { slugificar } from "@/loja/lib/catalogo/listagem";
import { EMPRESA } from "@/loja/lib/empresa";
import { AvisoDemonstracao } from "./AvisoDemonstracao";
import {
  amostra,
  amostras,
  apoioCartao,
  apoioOpcional,
  botaoCompra,
  cartaoInfo,
  cartaoOpcao,
  cartaoOpcional,
  cartoes,
  circulo,
  divisoria,
  linhaApoio,
  linhaRotulo,
  linkSeta,
  linkTrilha,
  parcelamento,
  pilulaBotao,
  preco,
  precoBotao,
  rotulo,
  rotuloBotao,
  secoes,
  seloPix,
  titulo,
  trilha,
  trilhoPilula,
  valor,
} from "./estilosPainel";

// Só o que o painel precisa (o projeto inteiro não vai para o navegador).
export type DadosProjeto = {
  slug: string;
  nome: string; // "Projeto Jardim de Camomila"
  variacao: string; // "Floral · Menina", em cinza no título
  precoBase: number; // reais, "a partir de" (pacote Essencial)
  paleta: Cor[];
  prazo: string; // "30 dias úteis"
  trilha: Array<{ rotulo: string; href: string }>;
  opcionais: Array<{ id: string; nome: string; curto: string; apoio: string; preco: number }>;
};

type Escolha = {
  dados: DadosProjeto;
  pacote: NomePacote;
  escolherPacote: (nome: NomePacote) => void;
  opcionais: string[];
  alternarOpcional: (id: string) => void;
  total: number; // reais
  botaoPrincipal: RefObject<HTMLButtonElement | null>;
  adicionar: () => void;
};

const ContextoProjeto = createContext<Escolha | null>(null);

function useEscolha(): Escolha {
  const valor = useContext(ContextoProjeto);
  if (!valor) throw new Error("useEscolha fora do ProjetoProvider");
  return valor;
}

const ROTULO_PIX = `${DESCONTO_PIX_PERCENTUAL}% OFF no Pix`;
const linkWhatsapp = (texto: string) => `https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent(texto)}`;

// Estado da escolha compartilhado pelo painel e pela pílula fixa (como o CompraProvider da página de
// produto): pacote (também na URL, ?pacote=), opcionais e a confirmação "Adicionado ao seu enxoval".
// O projeto vai para a MESMA sacola dos produtos (item do tipo "projeto").
export function ProjetoProvider({ dados, sugestoes, children }: { dados: DadosProjeto; sugestoes: Sugestao[]; children: ReactNode }) {
  const [pacote, setPacote] = useState<NomePacote>(PACOTES[0].nome);
  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [confirmado, setConfirmado] = useState(false);
  const botaoPrincipal = useRef<HTMLButtonElement>(null);

  // Pacote vindo da URL (link compartilhado ou volta da sacola) e a seleção antiga indo para a sacola.
  useEffect(() => {
    migrarSelecaoAntiga();
    const pedido = new URLSearchParams(window.location.search).get("pacote");
    const achado = PACOTES.find((item) => slugificar(item.nome) === pedido);
    if (achado) setPacote(achado.nome);
  }, []);

  function escolherPacote(nome: NomePacote) {
    setPacote(nome);
    const url = new URL(window.location.href);
    url.searchParams.set("pacote", slugificar(nome));
    window.history.replaceState(window.history.state, "", url);
  }

  function alternarOpcional(id: string) {
    setOpcionais((atuais) => (atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]));
  }

  const acrescimo = PACOTES.find((item) => item.nome === pacote)?.acrescimo ?? 0;
  const total =
    dados.precoBase + acrescimo + dados.opcionais.filter((opcional) => opcionais.includes(opcional.id)).reduce((soma, opcional) => soma + opcional.preco, 0);

  function adicionar() {
    adicionarAoCarrinho({ tipo: "projeto", slug: dados.slug, pacote: pacoteValido(pacote), opcionais, quantidade: 1 });
    setConfirmado(true);
  }

  const curtos = dados.opcionais.filter((opcional) => opcionais.includes(opcional.id)).map((opcional) => opcional.curto);
  const centavos = total * 100;

  return (
    <ContextoProjeto.Provider value={{ dados, pacote, escolherPacote, opcionais, alternarOpcional, total, botaoPrincipal, adicionar }}>
      {children}
      <ConfirmacaoCarrinho
        aberta={confirmado}
        aoFechar={() => setConfirmado(false)}
        item={{
          nome: dados.nome,
          detalhe: [`Pacote ${pacote}`, ...curtos].join(" · "),
          quantidade: 1,
          preco: decimal(centavos),
          pix: decimal(Math.round((centavos * (100 - DESCONTO_PIX_PERCENTUAL)) / 100)),
          paleta: dados.paleta.map((cor) => cor.hex),
        }}
        sugestoes={sugestoes}
      />
    </ContextoProjeto.Provider>
  );
}

// Painel do projeto no padrão do painel de compra da página de produto: trilha, nome com a variação em
// cinza, preço "a partir de" com o selo do Pix, paleta em bolinhas, pacote (cartões de opção com o que
// inclui e o acréscimo), opcionais, cartões de produção e de entrega, botão com o preço da escolha e a
// nota de que o pedido é finalizado pelo WhatsApp. No celular a PALETA vem primeiro, como a cor.
export function PainelProjeto() {
  const { dados, pacote, escolherPacote, opcionais, alternarOpcional, total, botaoPrincipal, adicionar } = useEscolha();
  const [corEmFoco, setCorEmFoco] = useState<string | null>(null);
  const itensPacote = PACOTES.find((item) => item.nome === pacote)?.itens ?? [];

  return (
    <div id="painel-compra" className={secoes}>
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

      <div>
        <h1 className={titulo}>
          {dados.nome}
          <span className={css({ color: "textoSuave" })}> {dados.variacao}</span>
        </h1>
        <p className={preco}>
          <span>
            <span className={css({ color: "textoSuave" })}>a partir de </span>
            {formatarPreco(dados.precoBase)}
          </span>
          <span className={seloPix}>{ROTULO_PIX}</span>
        </p>
      </div>

      <div className={css({ order: { base: "-1", desktop: "0" } })}>
        <p className={linhaRotulo}>
          <span className={rotulo}>Paleta</span>
          <span className={valor}>{corEmFoco ?? dados.paleta.map((cor) => cor.nome).join(", ")}</span>
        </p>
        <ul className={amostras}>
          {dados.paleta.map((cor) => (
            <li key={cor.hex}>
              {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a bolinha mostra o nome da cor ao focar, como na página de produto */}
              <span
                role="img"
                aria-label={cor.nome}
                tabIndex={0}
                onPointerEnter={() => setCorEmFoco(cor.nome)}
                onPointerLeave={() => setCorEmFoco(null)}
                onFocus={() => setCorEmFoco(cor.nome)}
                onBlur={() => setCorEmFoco(null)}
                className={amostra}
              >
                <span className={circulo} style={{ backgroundColor: cor.hex }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <fieldset className={css({ minW: "0" })}>
        <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
          <span className={rotulo}>Pacote</span>
          <span className={valor}>{pacote}</span>
        </legend>
        <ul className={css({ clear: "both", display: "grid", gap: "3", pt: "3" })}>
          {PACOTES.map((opcao) => (
            <li key={opcao.nome}>
              <button type="button" aria-pressed={pacote === opcao.nome} onClick={() => escolherPacote(opcao.nome)} className={cartaoOpcao}>
                <span className={css({ fontWeight: "medium" })}>{opcao.nome}</span>
                <span className={css({ whiteSpace: "nowrap", color: opcao.acrescimo ? "escuro" : "sucesso" })}>
                  {opcao.acrescimo ? `+ ${formatarPreco(opcao.acrescimo)}` : "Incluso"}
                </span>
                <span className={apoioCartao}>{opcao.frase}</span>
              </button>
            </li>
          ))}
        </ul>
        <p aria-live="polite" className={linhaApoio}>
          Inclui: {itensPacote.join("; ")}.
        </p>
      </fieldset>

      {dados.opcionais.length > 0 && (
        <fieldset className={css({ minW: "0" })}>
          <legend className={cx(linhaRotulo, css({ float: "left", w: "full" }))}>
            <span className={rotulo}>Complete o projeto</span>
            <span className={css({ fontSize: "sm", color: "textoSuave" })}>opcional</span>
          </legend>
          <ul className={css({ clear: "both", display: "grid", gap: "3", pt: "3" })}>
            {dados.opcionais.map((opcional) => {
              const ligado = opcionais.includes(opcional.id);
              return (
                <li key={opcional.id}>
                  <button type="button" aria-pressed={ligado} onClick={() => alternarOpcional(opcional.id)} className={cartaoOpcional}>
                    <span aria-hidden className={caixa} data-ligada={ligado || undefined}>
                      {ligado && <Check size={14} weight="bold" />}
                    </span>
                    <span className={css({ fontWeight: "medium" })}>{opcional.nome}</span>
                    <span className={css({ whiteSpace: "nowrap" })}>+ {formatarPreco(opcional.preco)}</span>
                    <span className={apoioOpcional}>{opcional.apoio}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <hr className={divisoria} />

      <ul aria-label="Produção e entrega" className={cartoes}>
        <li className={cartaoInfo}>
          <span className={css({ fontWeight: "medium", color: "escuro" })}>Produção sob encomenda</span>
          <span className={css({ color: "textoSuave" })}>Projetos: 20 a 35 dias úteis</span>
          <span className={css({ color: "sucesso" })}>Este: {dados.prazo}</span>
        </li>
        <li className={cartaoInfo}>
          <span className={css({ fontWeight: "medium", color: "escuro" })}>Entrega ou retirada</span>
          <span className={css({ color: "textoSuave" })}>Todo o Brasil, frete a combinar</span>
          <span className={css({ color: "sucesso" })}>
            Retirada em {EMPRESA.cidade}/{EMPRESA.uf}
          </span>
        </li>
      </ul>

      <div>
        <button ref={botaoPrincipal} type="button" onClick={adicionar} className={cx(botaoCompra, css({ w: "full" }))}>
          <span className={rotuloBotao}>Adicionar no meu enxoval</span>
          <span aria-live="polite" className={precoBotao}>
            <span className={css({ srOnly: true })}>a partir de </span>
            {formatarPreco(total)}
          </span>
        </button>
        <p className={parcelamento}>
          <Info size={16} aria-hidden className={css({ flexShrink: "0" })} />
          <span>Valor a partir de · {ROTULO_PIX} · Frete a combinar pelo WhatsApp</span>
        </p>
        <div className={css({ display: "grid", justifyItems: "start", gap: "2", mt: "4" })}>
          <a
            href={linkWhatsapp(`Olá! Quero fazer o pedido do ${dados.nome} (pacote ${pacote}).`)}
            target="_blank"
            rel="noreferrer"
            className={linkSeta}
          >
            Você finaliza o pedido pelo WhatsApp com o ateliê
            <CaretRight size={12} aria-hidden />
            <span className={css({ srOnly: true })}> (abre em nova aba)</span>
          </a>
          <Link href={`/projetos/monte-o-seu?projeto=${dados.slug}`} className={linkSeta}>
            Quer trocar peças? Monte o seu a partir deste projeto
            <CaretRight size={12} aria-hidden />
          </Link>
        </div>
      </div>

      <hr className={divisoria} />

      <AvisoDemonstracao />
    </div>
  );
}

// Pílula fixa (lululemon-pdp.md §1.4), igual à da página de produto: aparece quando o botão principal
// sai da tela por cima e some perto do rodapé.
export function PilulaProjeto() {
  const { botaoPrincipal, adicionar, total } = useEscolha();
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
      <button type="button" tabIndex={visivel ? undefined : -1} onClick={adicionar} className={cx(botaoCompra, pilulaBotao)}>
        <span className={rotuloBotao}>Adicionar no meu enxoval</span>
        <span className={precoBotao}>{formatarPreco(total)}</span>
      </button>
    </div>
  );
}

const caixa = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "5",
  h: "5",
  mt: "[1px]",
  borderRadius: "[4px]",
  borderWidth: "1px",
  borderColor: "contornoAmostra",
  bg: "superficie",
  color: "fundo",
  transitionProperty: "background-color, border-color",
  transitionDuration: "normal",
  "&[data-ligada]": { bg: "escuro", borderColor: "escuro" },
});
