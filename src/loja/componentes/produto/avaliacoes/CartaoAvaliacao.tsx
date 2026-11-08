"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { ArrowLeft, ArrowRight, X } from "@/loja/componentes/icones";
import { Modal } from "@/loja/componentes/layout/cabecalho/Gaveta";
import { type AvaliacaoPublica, type FotoAvaliacao, PARA_QUEM, urlFotoAvaliacao } from "@/loja/lib/avaliacoes/regras";
import { EMPRESA } from "@/loja/lib/empresa";
import { Estrelas } from "../Estrelas";

const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Fortaleza" });
export const formatarData = (iso: string) => dataCurta.format(new Date(iso)).replace(/ de /g, " ").replace(".", "");

export type GaleriaAberta = { fotos: FotoAvaliacao[]; indice: number; autora: string };

// Card de uma avaliação (lululemon-pdp.md §6): estrelas e data, título, texto, quem avaliou, as
// miniaturas (abrem o visualizador) e, quando houver, a "Resposta do ateliê" num bloco recuado.
export function CartaoAvaliacao({ avaliacao, aoAbrirFoto }: { avaliacao: AvaliacaoPublica; aoAbrirFoto: (galeria: GaleriaAberta) => void }) {
  const detalhes = [avaliacao.cidade, avaliacao.paraQuem && `Para: ${PARA_QUEM[avaliacao.paraQuem]}`].filter(Boolean).join(" · ");
  return (
    <article className={cartao} aria-labelledby={`avaliacao-${avaliacao.id}`}>
      <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3" })}>
        <Estrelas nota={avaliacao.nota} tamanho={16} />
        <time dateTime={avaliacao.criadaEm} className={css({ fontSize: "xs", color: "textoSuave" })}>
          {formatarData(avaliacao.criadaEm)}
        </time>
      </div>
      <h3 id={`avaliacao-${avaliacao.id}`} className={css({ mt: "3", fontSize: "md", fontWeight: "semibold", lineHeight: "texto", color: "escuro", overflowWrap: "anywhere" })}>
        {avaliacao.titulo}
      </h3>
      <p className={css({ mt: "2", fontSize: "md", lineHeight: "texto", color: "texto", whiteSpace: "pre-line", overflowWrap: "anywhere" })}>{avaliacao.texto}</p>
      <p className={css({ mt: "3", fontSize: "sm", color: "textoSuave" })}>
        <span className={css({ fontWeight: "medium", color: "escuro" })}>{avaliacao.nome}</span>
        {detalhes && ` · ${detalhes}`}
      </p>

      {avaliacao.fotos.length > 0 && (
        <ul aria-label={`Fotos de ${avaliacao.nome}`} className={css({ display: "flex", flexWrap: "wrap", gap: "2", mt: "4" })}>
          {avaliacao.fotos.map((foto, indice) => (
            <li key={foto.id}>
              <button
                type="button"
                aria-label={`Ampliar a foto ${indice + 1} de ${avaliacao.fotos.length} enviada por ${avaliacao.nome}`}
                onClick={() => aoAbrirFoto({ fotos: avaliacao.fotos, indice, autora: avaliacao.nome })}
                className={miniatura}
              >
                {/* biome-ignore lint/performance/noImgElement: WebP já recomprimido no servidor (400 px), servido pela API com cache imutável */}
                <img src={urlFotoAvaliacao(foto.id, "mini")} alt="" loading="lazy" decoding="async" width={80} height={80} className={imagemMiniatura} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {avaliacao.resposta && (
        <div className={resposta}>
          <p className={css({ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2", fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>
            Resposta do ateliê
            <time dateTime={avaliacao.resposta.em} className={css({ fontWeight: "normal", fontSize: "xs", color: "textoSuave" })}>
              {formatarData(avaliacao.resposta.em)}
            </time>
          </p>
          <p className={css({ mt: "2", fontSize: "sm", lineHeight: "texto", color: "texto", whiteSpace: "pre-line", overflowWrap: "anywhere" })}>{avaliacao.resposta.texto}</p>
          <p className={css({ mt: "2", fontSize: "xs", color: "textoSuave" })}>{EMPRESA.nomeFantasia}</p>
        </div>
      )}
    </article>
  );
}

// Fotos de uma avaliação ampliadas num diálogo central (base Modal: fade-in-up, Esc e véu fecham, o
// foco volta à miniatura). Setas na tela e do teclado navegam.
export function FotosAvaliacao({ galeria, aberta, aoFechar }: { galeria: GaleriaAberta | null; aberta: boolean; aoFechar: () => void }) {
  const [indice, setIndice] = useState(0);
  const [origem, setOrigem] = useState<GaleriaAberta | null>(null);
  // Nova galeria aberta: começa na foto clicada (ajuste de estado durante a renderização).
  if (galeria && galeria !== origem) {
    setOrigem(galeria);
    setIndice(galeria.indice);
  }
  const fotos = origem?.fotos ?? [];
  const foto = fotos[Math.min(indice, fotos.length - 1)];
  const total = fotos.length;
  const ir = (passo: number) => setIndice((atual) => Math.min(total - 1, Math.max(0, atual + passo)));

  return (
    <Modal aberta={aberta} aoFechar={aoFechar} rotulo="Foto da avaliação" classeCaixa={caixa}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: setas do teclado dentro do diálogo */}
      <div
        onKeyDown={(evento) => {
          if (evento.key === "ArrowRight") ir(1);
          if (evento.key === "ArrowLeft") ir(-1);
        }}
        className={css({ display: "grid", gap: "3", p: { base: "3", md: "4" } })}
      >
        <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3" })}>
          <p aria-live="polite" className={css({ fontSize: "sm", color: "textoSuave" })}>
            Foto {indice + 1} de {total}
            {origem && ` · ${origem.autora}`}
          </p>
          <button type="button" data-autofoco aria-label="Fechar foto" onClick={aoFechar} className={botaoRedondo}>
            <X size={16} aria-hidden />
          </button>
        </div>
        {foto && (
          // biome-ignore lint/performance/noImgElement: foto já otimizada no servidor (WebP 1600 px)
          <img
            key={foto.id}
            src={urlFotoAvaliacao(foto.id, "grande")}
            alt={`Foto ${indice + 1} enviada por ${origem?.autora ?? "cliente"}`}
            width={foto.largura}
            height={foto.altura}
            className={imagemGrande}
          />
        )}
        {total > 1 && (
          // biome-ignore lint/a11y/useSemanticElements: grupo de dois botões em linha
          <div role="group" aria-label="Navegar nas fotos" className={css({ display: "flex", justifyContent: "center", gap: "2" })}>
            <button type="button" aria-label="Foto anterior" disabled={indice === 0} onClick={() => ir(-1)} className={botaoRedondo}>
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button type="button" aria-label="Próxima foto" disabled={indice >= total - 1} onClick={() => ir(1)} className={botaoRedondo}>
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

const cartao = css({ py: "8", borderBottomWidth: "1px", borderColor: "borda", _first: { pt: "0" } });

const miniatura = css({
  display: "block",
  w: "20",
  h: "20",
  borderRadius: "md",
  overflow: "hidden",
  bg: "fundoProduto",
  cursor: "zoom-in",
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
  _hover: { "& img": { transform: "scale(1.04)" } },
});

const imagemMiniatura = css({ w: "full", h: "full", objectFit: "cover", transition: "transform", transitionDuration: "zoom", transitionTimingFunction: "assinatura" });

const resposta = css({ mt: "5", ml: { base: "0", md: "6" }, p: "4", borderRadius: "lg", bg: "fundoSutil", borderLeftWidth: "[3px]", borderColor: "marca" });

const caixa = css({ w: "fit-content", minW: "[min(320px, calc(100vw - 32px))]", maxW: "[min(1100px, calc(100vw - 32px))]", borderRadius: "bloco" });

const imagemGrande = css({ display: "block", w: "auto", maxW: "full", h: "auto", maxH: "[calc(100dvh - 180px)]", mx: "auto", objectFit: "contain", borderRadius: "lg", bg: "fundoProduto" });

const botaoRedondo = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "10",
  h: "10",
  borderRadius: "pilula",
  bg: "fundoSutil",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "superficieSuave" },
  _disabled: { color: "desabilitado", cursor: "default", _hover: { bg: "fundoSutil" } },
  _focusVisible: { outline: "none", boxShadow: "anelFoco" },
});
